import { Injectable, isDevMode } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Router } from "@angular/router";

import { map } from 'rxjs/operators';

import { JwtHelperService } from '@auth0/angular-jwt';

import { TeamFactory } from "./../http/team/team.factory";
import {
  UserRoleService,
  Permissions
} from "../../shared/model/permission.data";
import { Angulartics2Mixpanel } from "angulartics2/mixpanel";
import { environment } from "../../config/environment";
import { LoaderService } from "../../shared/components/loading/loader.service";
import { Observable ,  Subject } from "rxjs";
import { AuthConfiguration } from "./auth.config";
import { DatasetFactory } from "../http/map/dataset.factory";
import { UserFactory } from "../http/user/user.factory";
import { User } from "../../shared/model/user.data";
import { EmitterService } from "../services/emitter.service";
import { uniq } from "lodash-es";
import * as LogRocket from "logrocket";
import { Intercom } from "ng-intercom";

@Injectable()
export class Auth {
  private MAPTIO_INTERNAL_EMAILS = [
    "safiyya.babio@gmail.com",
    "hello@tomnixon.co.uk",
    "karlparton@gmail.com",
    "lisa@reimaginaire.com",
    "hellochandnipatel@gmail.com",
    "clemens.anzmann@googlemail.com",
    "maptio@robski.net"
  ];

  private user$: Subject<User> = new Subject();
  private permissions: Permissions[] = [];
  private fullstory: any = window["FS"];

  constructor(
    private http: HttpClient,
    private jwtHelper: JwtHelperService,
    private configuration: AuthConfiguration,
    private datasetFactory: DatasetFactory,
    private userFactory: UserFactory,
    private teamFactory: TeamFactory,
    private router: Router,
    private loader: LoaderService,
    private userRoleService: UserRoleService,
    private analytics: Angulartics2Mixpanel,
    private intercom: Intercom
  ) {}

  public logout(): void {
    this.clear();
    this.user$.unsubscribe();
    this.router.navigateByUrl("/logout");
    this.analytics.eventTrack("Logout", {});
    this.fullstory.shutdown();
  }

  /**
   * Clear local storage while keeping some settings
   *
   * This should be used in favour of localStorage.clear() whenever local storage needs to be cleaned out
   */
  public clear() {
    let persist = new Map<string, string>();
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i).indexOf("map_settings") > -1) {
        persist.set(
          localStorage.key(i),
          localStorage.getItem(localStorage.key(i))
        );
      }
      if (localStorage.key(i).indexOf("redirectUrl") > -1) {
        persist.set(
          localStorage.key(i),
          localStorage.getItem(localStorage.key(i))
        );
      }
    }

    localStorage.clear();
    persist.forEach((value: string, key: string) => {
      localStorage.setItem(key, value);
    });
  }

  /**
   * Checks for presence of token and that token hasn't expired.
   * For use with the @CanActivate router decorator and NgIf
   *
   * Copied and adjusted from: https://github.com/auth0/angular2-jwt/blob/0.2.3/angular2-jwt.ts
   * while patching to use latest versions of auth libraries.
   */
  private tokenNotExpired(tokenName: string): boolean {
    const token: string = localStorage.getItem(tokenName);
    return token != null && !this.jwtHelper.isTokenExpired(token);
  }

  /**
   * Checks if Auth0 Management API is still valid
   */
  public authenticationProviderAuthenticated() {
    return this.tokenNotExpired("access_token");
  }

  /**
   * Checks if Maptio API is still valid
   */
  public internalApiAuthenticated() {
    return this.tokenNotExpired("maptio_api_token");
  }

  /**
   * Checks is ID token is still valid
   */
  public authenticated(): boolean {
    return this.tokenNotExpired("id_token");
  }

  // TODO: This gets called hundreds of times every second and it's not an entirely trivial
  // computation, would be good to refactor this!!!
  public allAuthenticated() {
    return (
      this.authenticated() &&
      this.internalApiAuthenticated() &&
      this.authenticationProviderAuthenticated()
    );
  }

  public loginMaptioApi(email: string, password: string) {
    if (!email || !password) return;

    this.configuration.getWebAuth().client.login(
      {
        realm: environment.CONNECTION_NAME,
        username: email,
        password: password,
        scope: "openid profile api invite",
        audience: environment.MAPTIO_API_URL
      },
      function(err: any, authResult: any) {
        if (authResult.accessToken) {
          EmitterService.get("maptio_api_token").emit(authResult.accessToken);
        }
      }
    );
  }

  public loginMaptioApiSSO() {
    return new Promise((resolve, reject) => {
      this.configuration.getWebAuth().checkSession(
        {
          scope: "openid profile api invite",
          audience: environment.MAPTIO_API_URL,
          responseType: "token id_token",
          redirectUri: `${window.location.protocol}//${
            window.location.hostname
          }${
            window.location.port === "" ? "" : `:${window.location.port}`
          }/authorize`,
          connection: "google-oauth2"
        },
        function(err: any, authResult: any) {
          if (err) {
            console.error(err);
            reject(err);
          }
          resolve({
            accessToken: authResult.accessToken,
            idToken: authResult.idToken
          });
        }
      );
    });
  }

  public getUserInfo(userId: string): Promise<User> {
    return this.configuration.getAccessToken().then((token: string) => {
      const httpOptions = {
        headers: new HttpHeaders({
          Authorization: 'Bearer ' + token
        })
      };

      return this.http
        .get(
          `https://${environment.AUTH0_DOMAIN}/api/v2/users/` + userId,
          httpOptions
        )
        .pipe(
          map((input: any) => {
            return User.create().deserialize(input);
          }),
        )
        .toPromise();
    });
  }

  public getPermissions(): Permissions[] {
    return this.permissions;
  }

  public getUser(): Observable<User> {
    let profileString = localStorage.getItem("profile");

    if (profileString) {
      Promise.all([
        this.getUserInfo(JSON.parse(profileString).user_id),
        this.userFactory.get(JSON.parse(profileString).user_id)
      ])
        .then(([auth0User, databaseUser]: [User, User]) => {
          let user = auth0User;
          user.teams = uniq(databaseUser.teams); // HACK : where does the duplication comes from?
          user.shortid = databaseUser.shortid;
          return user;
        })
        .then((user: User) => {
          return user.teams.length > 0
            ? this.teamFactory
                .get(user.teams)
                .then(teams =>
                  teams.filter(team => team.isExample).map(team => team.team_id)
                )
                .then(exampleTeamIds => {
                  user.exampleTeamIds = exampleTeamIds;
                  return user;
                })
            : user;
        })
        .then((user: User) => {
          console.log("user", user);
          this.permissions = this.userRoleService.get(user.userRole);
          return user;
        })
        .then((user: User) => {
          this.datasetFactory.get(user).then(ds => {
            user.datasets = uniq(ds);
            EmitterService.get("headerUser").emit(user);
            this.user$.next(user);
          });
        });
    } else {
      this.user$.next(undefined);
    }
    return this.user$.asObservable();
  }

  public setUser(profile: any): Promise<boolean> {
    localStorage.setItem("profile", JSON.stringify(profile));
    return this.userFactory
      .get(profile.user_id)
      .then(user => {
        this.user$.next(user);
        return Promise.resolve<boolean>(true);
      })
      .catch((reason: any) => {
        let user = User.create().deserialize(profile);
        this.userFactory
          .create(user)
          .then(() => {
            return Promise.resolve<boolean>(true);
          })
          .catch(() => {
            return Promise.resolve<boolean>(false);
          }); // adds the user in the database
        this.user$.next(user);
        return Promise.resolve<boolean>(true);
      });
  }

  // public addMinutes(date: Date, minutes: number) {
  //     return new Date(date.getTime() + minutes * 60000);
  // }

  public googleSignIn() {
    this.signin("google-oauth2");
  }

  private signin(connection: string) {
    this.configuration.getWebAuth().authorize({
      scope: "profile openid email",
      responseType: "token",
      redirectUri: `${window.location.protocol}//${window.location.hostname}${
        window.location.port === "" ? "" : `:${window.location.port}`
      }/authorize`,
      connection: connection
    });
  }

  public login(email: string, password: string): Promise<boolean> {
    this.loader.show();
    try {
      this.configuration.getWebAuth().client.login(
        {
          realm: environment.CONNECTION_NAME,
          username: email,
          password: password,
          scope: "profile openid email"
        },
        function(err: any, authResult: any) {
          if (err) {
            EmitterService.get("loginErrorMessage").emit(err.description);
            return;
          }
          this.user$ = new Subject();
          localStorage.setItem("id_token", authResult.idToken);

          if (authResult.accessToken) {
            this.configuration.getWebAuth().client.userInfo(
              authResult.accessToken,
              function(err: Error, profile: any) {
                profile.user_id = profile.sub;
                profile.sub = undefined;
                this.loader.show();
                this.loginMaptioApi(email, password);

                EmitterService.get("maptio_api_token").subscribe(
                  (token: string) => {
                    if (localStorage.getItem("maptio_api_token"))
                      localStorage.removeItem("maptio_api_token");
                    localStorage.setItem("maptio_api_token", token);

                    return this.setUser(profile).then((isSuccess: boolean) => {
                      if (isSuccess) {
                        this.loader.show();
                        return this.userFactory
                          .get(profile.user_id)
                          .then((user: User) => {
                            this.user$.next(user);
                            return user;
                          })
                          .then(
                            (user: User) => {
                              this.loader.show();

                              if (isDevMode()) return user;

                              let isMaptioTeam = this.MAPTIO_INTERNAL_EMAILS.includes(
                                user.email
                              );

                              this.analytics.setSuperProperties({
                                user_id: user.user_id,
                                email: user.email,
                                hostname: window.location.hostname,
                                isInternal: isMaptioTeam
                              });
                              this.analytics.eventTrack("Login", {
                                email: user.email,
                                firstname: user.firstname,
                                lastname: user.lastname
                              });
                              LogRocket.identify(user.user_id, {
                                name: user.name,
                                email: user.email
                              });
                              this.fullstory.identify(user.user_id, {
                                displayName: user.name,
                                email: user.email
                              });
                              this.intercom.update({
                                app_id: environment.INTERCOM_APP_ID,
                                email: user.email,
                                name: user.name,
                                avatar: {
                                  type: "avatar",
                                  image_url: user.picture
                                },
                                is_invited: user.isInvitationSent,
                                user_id: user.user_id
                              });

                              return user;
                            },
                            () => {
                              this.loader.hide();
                            }
                          )
                          .then((user: User) => {
                            // let welcomeURL = user.datasets.length === 1 ? `/map/${user.datasets[0]}/welcome/initiatives` : `/home`;
                            this.loader.hide();
                            let redirectUrl =
                              localStorage.getItem("redirectUrl") &&
                              localStorage.getItem("redirectUrl") !== null &&
                              localStorage.getItem("redirectUrl") !== "null"
                                ? localStorage.getItem("redirectUrl")
                                : null;
                            this.router.navigateByUrl(
                              redirectUrl ? redirectUrl : "/home"
                            );

                            // Prevent the URL from being persisted between sessions
                            if (redirectUrl) localStorage.removeItem("redirectUrl");
                          });
                      } else {
                        this.errorService.handleError(
                          "Something has gone wrong ! Try again ?"
                        );
                      }
                    });
                  }
                );
              }.bind(this)
            );
          }
        }.bind(this)
      );
    } catch (error) {
      return Promise.reject(error);
    } finally {
      this.loader.hide();
    }
  }
}