import { Angulartics2Mixpanel } from "angulartics2";
import { Router } from "@angular/router";
import { OnInit, EventEmitter } from "@angular/core";
import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from "@angular/core";
import { User } from "../../shared/model/user.data";
import { Team } from "../../shared/model/team.data";
import { DataSet } from "../../shared/model/dataset.data";
import { Auth } from "../authentication/auth.service";
import { DatasetFactory } from "../http/map/dataset.factory";
import { TeamFactory } from "../http/team/team.factory";
import { EmitterService } from "../../shared/services/emitter.service";
import { ErrorService } from "../../shared/services/error/error.service";
import { Initiative } from "../../shared/model/initiative.data";
import { UserService } from "../../shared/services/user/user.service";
import { sortBy, isEmpty } from "lodash-es";
import { SafeUrl, DomSanitizer } from "@angular/platform-browser";
import { BillingService } from "../../shared/services/billing/billing.service";
import { LoaderService } from "../../shared/services/loading/loader.service";
import { OnboardingService } from "../../shared/components/onboarding/onboarding.service";
import { Subscription } from "rxjs/Subscription";
import { Observable } from "rxjs/Observable";
import { from , forkJoin} from "rxjs";
import { partition, mergeMap, map } from "rxjs/operators";


@Component({
    selector: "header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.css"],
    changeDetection: ChangeDetectionStrategy.Default
})

export class HeaderComponent implements OnInit {
    public user: User;

    public datasets: Array<any>;
    private teams: Array<Team>;
    public sampleTeams: Team[];
    public team: Team;
    public selectedDataset: DataSet;
    public areMapsAvailable: Promise<boolean>
    public isCreateMode: boolean = false;
    public isHeaderCollapsed: boolean;

    public emitterSubscription: Subscription;
    public userSubscription: Subscription;

    public isSaving: Boolean = false;
    public isSandbox: boolean;

    constructor(public auth: Auth, private userService: UserService, private datasetFactory: DatasetFactory, private teamFactory: TeamFactory,
        public errorService: ErrorService, private router: Router, public loaderService: LoaderService,
        private analytics: Angulartics2Mixpanel, private cd: ChangeDetectorRef, private billingService: BillingService,
        private onboarding: OnboardingService) {

        let [teamDefined, teamUndefined] = from(EmitterService.get("currentTeam")).partition((team: Team) => !!team);

        teamDefined.flatMap((team: Team) => {
            return this.billingService.getTeamStatus(team).map((value: { created_at: Date, freeTrialLength: Number, isPaying: Boolean }) => {
                team.createdAt = value.created_at;
                team.freeTrialLength = value.freeTrialLength;
                team.isPaying = value.isPaying;
                return team;
            })
        })
            .subscribe((value: Team) => {
                this.team = value;
                this.cd.markForCheck();
            });

        teamUndefined
            .subscribe((value: Team) => {
                this.team = value;
                this.cd.markForCheck();
            });
            
    }

    ngAfterViewInit() {
        this.cd.markForCheck();
    }

    ngOnDestroy() {
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
        }
    }


    ngOnInit() {
        this.userSubscription = EmitterService.get("headerUser").asObservable().pipe(
            mergeMap((user: User) => {
                return forkJoin(
                    isEmpty(user.datasets) ? Promise.resolve([]) : this.datasetFactory.get(user.datasets, true),
                    isEmpty(user.teams) ? Promise.resolve([]) : this.teamFactory.get(user.teams),
                    Promise.resolve(user)
                )
            }),
            map(([datasets, teams, user]: [DataSet[], Team[], User]) => {
                return [datasets.filter(d => !d.isArchived).map(d => {
                    d.team = teams.find(t => d.initiative.team_id === t.team_id);
                    return d
                }),
                    teams,
                    user]
            }),
            map(([datasets, teams, user]: [DataSet[], Team[], User]) => {
                return {
                    datasets: sortBy(datasets, d => d.initiative.name),
                    teams: sortBy(teams, t => t.name),
                    user: user
                }
            })
        )


            // .mergeMap((user: User) => {
            //     return Observable.forkJoin(
            //         isEmpty(user.datasets) ? Promise.resolve([]) : this.datasetFactory.get(user.datasets, true),
            //         isEmpty(user.teams) ? Promise.resolve([]) : this.teamFactory.get(user.teams),
            //         Promise.resolve(user)
            //     )
            // })
            // .map(([datasets, teams, user]: [DataSet[], Team[], User]) => {
            //     return [datasets.filter(d => !d.isArchived).map(d => {
            //         d.team = teams.find(t => d.initiative.team_id === t.team_id);
            //         return d
            //     }), 
            //     teams, 
            //     user]
            // })
            // .map(([datasets, teams, user]: [DataSet[], Team[], User]) => {
            //     return {
            //         datasets: sortBy(datasets, d => d.initiative.name),
            //         teams: sortBy(teams, t => t.name),
            //         user: user
            //     }
            // })
            .subscribe((data: { datasets: DataSet[], teams: Team[], user: User }) => {
                this.user = data.user;
                this.datasets = data.datasets;
                this.teams = data.teams.filter(t => !t.isExample);
                this.sampleTeams = data.teams.filter(t => t.isExample);
                this.isSandbox = this.sampleTeams.length >= 1 && this.teams.length === 0;

                this.cd.markForCheck();
            },
                (error: any) => { console.error(error) });
    }

    onNewMap(dataset: DataSet) {
        this.isCreateMode = false;
        this.selectedDataset = dataset;
        this.analytics.eventTrack("Create a map", { email: this.user.email, name: dataset.initiative.name, team: dataset.initiative.team_id })

    }

    isSignUp() {
        return this.router.url.startsWith("/login") || this.router.url.startsWith("/signup") || this.router.url.startsWith("/forgot")
    }

    isMap() {
        return this.router.url.startsWith("/map")
    }

    isHome() {
        return this.router.url.startsWith("/home")

    }

    isTeam() {
        return this.router.url.startsWith("/teams")

    }

    isPricing() {
        return this.router.url.startsWith("/pricing")

    }

    toggleCreateMode() {
        this.isCreateMode = !this.isCreateMode;
    }

    openOnboarding() {
        this.onboarding.open(this.user);
    }

}