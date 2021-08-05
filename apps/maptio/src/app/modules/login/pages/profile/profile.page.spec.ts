import { ProfilePage } from "./profile.page";
import { ComponentFixture, TestBed, waitForAsync } from "@angular/core/testing";
import { Subject } from "rxjs";
import { User } from "../../../../shared/model/user.data";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { NgProgressModule, NgProgress } from "@ngx-progressbar/core";
import { CloudinaryModule, Cloudinary } from "@cloudinary/angular-5.x";
import { environment } from "../../../../config/environment";
import { Auth } from "../../../../core/authentication/auth.service";
import { AuthHttp } from "angular2-jwt";
import { authHttpServiceFactoryTesting } from "../../../../core/mocks/authhttp.helper.shared";
import { Http, BaseRequestOptions } from "@angular/http";
import { MockBackend } from "@angular/http/testing";
import { ErrorService } from "../../../../shared/services/error/error.service";
import { UserService } from "../../../../shared/services/user/user.service";
import { JwtEncoder } from "../../../../shared/services/encoding/jwt.service";
import { MailingService } from "../../../../shared/services/mailing/mailing.service";
import { AuthConfiguration } from "../../../../core/authentication/auth.config";
import { UserFactory } from "../../../../core/http/user/user.factory";
import { LoaderService } from "../../../../shared/components/loading/loader.service";
import { ImageModule } from "../../../../shared/image.module";

describe("profile.page.ts", () => {

    let component: ProfilePage;
    let target: ComponentFixture<ProfilePage>;
    let user$: Subject<User> = new Subject<User>();

    beforeEach(waitForAsync(() => {

        TestBed.configureTestingModule({
            declarations: [ProfilePage],
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NgProgressModule, ImageModule]
        }).overrideComponent(ProfilePage, {
            set: {
                providers: [
                    { provide: Auth, useClass: class { getUser() { return user$.asObservable() } } },
                    {
                        provide: AuthHttp,
                        useFactory: authHttpServiceFactoryTesting,
                        deps: [Http, BaseRequestOptions]
                    },
                    {
                        provide: Http,
                        useFactory: (mockBackend: MockBackend, options: BaseRequestOptions) => {
                            return new Http(mockBackend, options);
                        },
                        deps: [MockBackend, BaseRequestOptions]
                    },
                    ErrorService, UserService, JwtEncoder, MailingService, MockBackend,
                    BaseRequestOptions, AuthConfiguration, UserFactory,
                    {
                        provide: LoaderService,
                        useClass: class {
                            hide = jest.fn()
                            show = jest.fn()
                        },
                        deps: [NgProgress]
                    }, 
                    NgProgress
                ]
            }
        }).compileComponents();
    }));

    beforeEach(() => {
        target = TestBed.createComponent(ProfilePage);

        component = target.componentInstance;

        target.detectChanges();
    });

    it("should send error to error service when data gathering fails", () => {
        let spyError = spyOn(component.errorService, "handleError").and.callFake(() => { return; });
        user$.error("Cant retrieve user");
        expect(spyError).toHaveBeenCalledWith("Cant retrieve user");
    });

    it("should get rid of subscription on destroy", () => {
        let spy = spyOn(component.subscription, "unsubscribe")
        target.destroy();
        expect(spy).toHaveBeenCalled();
    })

    describe("updatePicture", () => {
        it("should update profile picture", waitForAsync(() => {
            component.user = new User({ user_id: "some_new_id" });


            let mockUserService = target.debugElement.injector.get(UserService);
            let mockUserFactory = target.debugElement.injector.get(UserFactory);
            let spyUpdateUserProfile = spyOn(mockUserService, "updateUserPictureUrl").and.returnValue(Promise.resolve(true))
            let spyUpsert = spyOn(mockUserFactory, "upsert").and.returnValue(Promise.resolve(true))
            let spyGetUser = spyOn(target.debugElement.injector.get(Auth), "getUser")

            component.updatePicture("picture_url");

            expect(spyUpdateUserProfile).toHaveBeenCalledWith("some_new_id", "picture_url");
            spyUpdateUserProfile.calls.mostRecent().returnValue
                .then(() => {
                    expect(spyGetUser).toHaveBeenCalled();
                })
                .then(() => {
                    expect(spyUpsert).toHaveBeenCalledWith(jasmine.objectContaining({ user_id: "some_new_id", picture: "picture_url" }))
                })
        }));

        it("should display error messgae when update profile picture fails", waitForAsync(() => {
            component.user = new User({ user_id: "some_new_id" });


            let mockUserService = target.debugElement.injector.get(UserService);
            let mockUserFactory = target.debugElement.injector.get(UserFactory);
            let spyUpdateUserProfile = spyOn(mockUserService, "updateUserPictureUrl").and.returnValue(Promise.resolve(false))
            let spyUpsert = spyOn(mockUserFactory, "upsert")
            let spyGetUser = spyOn(target.debugElement.injector.get(Auth), "getUser")

            component.updatePicture("picture_url");

            expect(spyUpdateUserProfile).toHaveBeenCalledWith("some_new_id", "picture_url");
            spyUpdateUserProfile.calls.mostRecent().returnValue
                .then(() => {
                    expect(spyGetUser).not.toHaveBeenCalled();
                })
                .then(() => {
                    expect(spyUpsert).not.toHaveBeenCalled();
                })
        }));

        it("should display error messgae when update profile picture fails", waitForAsync(() => {
            component.user = new User({ user_id: "some_new_id" });


            let mockUserService = target.debugElement.injector.get(UserService);
            let mockUserFactory = target.debugElement.injector.get(UserFactory);
            let spyUpdateUserProfile = spyOn(mockUserService, "updateUserPictureUrl").and.returnValue(Promise.resolve(true))
            let spyUpsert = spyOn(mockUserFactory, "upsert").and.returnValue(Promise.resolve(false))
            let spyGetUser = spyOn(target.debugElement.injector.get(Auth), "getUser")

            component.updatePicture("picture_url");

            expect(spyUpdateUserProfile).toHaveBeenCalledWith("some_new_id", "picture_url");
            spyUpdateUserProfile.calls.mostRecent().returnValue
                .then(() => {
                    expect(spyGetUser).toHaveBeenCalled();
                })
                .then(() => {
                    expect(spyUpsert).toHaveBeenCalledWith(jasmine.objectContaining({ user_id: "some_new_id", picture: "picture_url" }))
                })
        }));

    })

    describe("save", () => {
        it("should do nothing if form is invalid", waitForAsync(() => {
            component.accountForm.setValue({
                firstname: "something",
                lastname: ""
            })

            let mockUserService = target.debugElement.injector.get(UserService);
            let spy = spyOn(mockUserService, "updateUserProfile")

            component.save();

            expect(spy).not.toHaveBeenCalled();
        }));

        it("should display correct confirmation messages  when update user profile succeed", waitForAsync(() => {

            component.user = new User({ user_id: "some_new_id" });

            component.accountForm.setValue({
                firstname: "something",
                lastname: "else"
            });
            component.accountForm.markAsDirty();

            let mockUserService = target.debugElement.injector.get(UserService);
            let mockUserFactory = target.debugElement.injector.get(UserFactory);
            let spyUpdateUserProfile = spyOn(mockUserService, "updateUserProfile").and.returnValue(Promise.resolve(true))
            let spyUpsert = spyOn(mockUserFactory, "upsert").and.returnValue(Promise.resolve(true))
            let spyGetUser = spyOn(target.debugElement.injector.get(Auth), "getUser")
            component.save();

            expect(spyUpdateUserProfile).toHaveBeenCalledWith("some_new_id", "something", "else");
            spyUpdateUserProfile.calls.mostRecent().returnValue
                .then(() => {
                    expect(spyGetUser).toHaveBeenCalled();
                    expect(component.feedbackMessage).toBe("Successfully updated.")
                })
                .then(() => {
                    expect(spyUpsert).toHaveBeenCalledWith(jasmine.objectContaining({ user_id: "some_new_id", firstname: "something", lastname: "else" }))
                })
        }));

        it("should display correct error messages when update user profile fails", waitForAsync(() => {
            component.user = new User({ user_id: "some_new_id" });

            component.accountForm.setValue({
                firstname: "something",
                lastname: "else"
            });
            component.accountForm.markAsDirty();

            let mockUserService = target.debugElement.injector.get(UserService);
            let mockUserFactory = target.debugElement.injector.get(UserFactory);
            let spyUpdateUserProfile = spyOn(mockUserService, "updateUserProfile").and.returnValue(Promise.resolve(false))
            let spyUpsert = spyOn(mockUserFactory, "upsert");
            let spyGetUser = spyOn(target.debugElement.injector.get(Auth), "getUser")
            component.save();

            expect(spyUpdateUserProfile).toHaveBeenCalledWith("some_new_id", "something", "else");
            spyUpdateUserProfile.calls.mostRecent().returnValue
                .then(() => {
                    expect(spyGetUser).not.toHaveBeenCalled();
                })
                .then(() => {
                    expect(spyUpsert).not.toHaveBeenCalled()
                })
                .catch(() => {
                    expect(this.errorMessage).toBe("Can't update your user information.")
                })
        }));

        it("should display correct confirmation messages  when sync user profile fails ", waitForAsync(() => {
            component.user = new User({ user_id: "some_new_id" });

            component.accountForm.setValue({
                firstname: "something",
                lastname: "else"
            });
            component.accountForm.markAsDirty();

            let mockUserService = target.debugElement.injector.get(UserService);
            let mockUserFactory = target.debugElement.injector.get(UserFactory);
            let spyUpdateUserProfile = spyOn(mockUserService, "updateUserProfile").and.returnValue(Promise.resolve(true))
            let spyUpsert = spyOn(mockUserFactory, "upsert").and.returnValue(Promise.resolve(false))
            let spyGetUser = spyOn(target.debugElement.injector.get(Auth), "getUser")
            component.save();

            expect(spyUpdateUserProfile).toHaveBeenCalledWith("some_new_id", "something", "else");
            spyUpdateUserProfile.calls.mostRecent().returnValue
                .then(() => {
                    expect(spyGetUser).toHaveBeenCalled();
                })
                .then(() => {
                    expect(spyUpsert).toHaveBeenCalledWith(jasmine.objectContaining({ user_id: "some_new_id", firstname: "something", lastname: "else" }))
                })
                .catch(() => {
                    expect(this.errorMessage).toBe("Can't sync your user information.")
                })
        }));

    });

});