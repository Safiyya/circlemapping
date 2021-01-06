import {
    Component,
    OnInit,
    // Output,
    // EventEmitter,
    ChangeDetectorRef,
    ChangeDetectionStrategy
} from "@angular/core";
// import { ActivatedRoute, Params, Router } from "@angular/router";
// import { Observable, Subscription, Subject } from "rxjs";

// import { Angulartics2Mixpanel } from "angulartics2/mixpanel";

import { RoleLibraryService } from "../../../services/role-library.service";
import { Role } from "../../../../../shared/model/role.data";
// import { DataService } from "../../../services/data.service";
// import { UserFactory } from "../../../../../core/http/user/user.factory";
// import { UserService } from "../../../../../shared/services/user/user.service";
// import { DataSet } from "../../../../../shared/model/dataset.data";
// import { Team } from "../../../../../shared/model/team.data";
// import { User } from "../../../../../shared/model/user.data";
// import { Permissions } from "../../../../../shared/model/permission.data";
// import { Initiative } from "../../../../../shared/model/initiative.data";
// import { LoaderService } from "../../../../../shared/components/loading/loader.service";


@Component({
    selector: "summary-roles",
    templateUrl: "./roles.component.html",
    styleUrls: ["./roles.component.css"],
    host: { "class": "d-flex flex-column w-100" },
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class RolesSummaryComponent implements OnInit {
    // @Output() selectInitiative: EventEmitter<Initiative> = new EventEmitter<Initiative>();
    // @Output() userDataset: EventEmitter<DataSet> = new EventEmitter<DataSet>();
    // @Output() rootInitiative: EventEmitter<Initiative> = new EventEmitter<Initiative>();

    // members: User[];
    // filteredMembers: User[];
    // initiative: Initiative;
    // team: Team;
    // dataset: DataSet;
    // selectedMember: User;
    // dataSubscription: Subscription;
    // filterMembers$: Subject<string> = new Subject<string>();
    // isOthersPeopleVisible: boolean;
    // Permissions = Permissions;

    public roles: Role[] = [];

    isEditRoleMode = false;
    roleBeingEdited: Role;


    constructor(
        private roleLibrary: RoleLibraryService,
        // public route: ActivatedRoute,
        // public userFactory: UserFactory,
        // private userService: UserService,
        // private dataService: DataService,
        // public loaderService: LoaderService,
        // private router: Router,
        // private cd: ChangeDetectorRef,
        // private analytics: Angulartics2Mixpanel, 
    ) {}

    ngOnInit(): void {
        this.roles = this.roleLibrary.getRoles();
    }
    
    onEditRole(role: Role) {
        this.roleBeingEdited = role;
        this.isEditRoleMode = true;
    }

    onCancelEditingRole() {
        this.roleBeingEdited = undefined;
        this.isEditRoleMode = false;
    }

    onChangeRole() {
        this.onCancelEditingRole();
        this.cd.markForCheck();
    }

    // ngOnInit(): void {
    //     this.loaderService.show();
    //     this.dataSubscription = this.dataService
    //         .get()
    //         .combineLatest(this.route.queryParams)
    //         .switchMap((data: [any, Params]) => {
    //             console.log(data)
    //             if (data[1].member) {
    //                 return this.userFactory.get(data[1].member)
    //                     .then(user => this.userService.getUsersInfo([user]))
    //                     .then((users: User[]) => {
    //                         console.log(users)
    //                         this.selectedMember = users[0];
    //                         this.cd.markForCheck();
    //                         return data[0];
    //                     });
    //             } else {
    //                 this.selectedMember = null;
    //                 this.cd.markForCheck();
    //                 return Observable.of(data[0])
    //             }
    //         })
    //         .subscribe((data: any) => {
    //             this.members = data.members;
    //             console.log(this.members)
    //             this.initiative = data.initiative;
    //             this.dataset = data.dataset;
    //             this.team = data.team;
    //             this.loaderService.hide();
    //             this.analytics.eventTrack("Map", {
    //                 action: "viewing",
    //                 view: "summary",
    //                 team: (<Team>data.team).name,
    //                 teamId: (<Team>data.team).team_id
    //             });
    //             this.filteredMembers = [].concat(this.members);
    //             this.cd.markForCheck();
    //         });

    //     this.filterMembers$.asObservable().debounceTime(250).subscribe((search) => {
    //         this.filteredMembers = (search === '')
    //             ? [].concat(this.members)
    //             : this.members.filter(m => m.name.toLowerCase().indexOf(search.toLowerCase()) >= 0);
    //         this.cd.markForCheck();
    //     })
    // }

    // ngOnDestroy(): void {
    //     if (this.dataSubscription) this.dataSubscription.unsubscribe();
    // }

    // onKeyDown(search: string) {
    //     this.filterMembers$.next(search);
    // }

    // onAddingNewMember(){
    //     this.router.navigateByUrl(`/teams/${this.team.team_id}/people`)
    // }

    // onSelectMember(user: User) {
    //     this.selectedMember = user;
    //     this.cd.markForCheck();
    //     this.router.navigate([], {
    //         relativeTo: this.route,
    //         queryParams: { member: user.shortid }
    //     })
    // }

    // onSelectInitiative(initiative: Initiative){
    //     this.selectInitiative.emit(initiative);
    // }
}
