import { Role } from "./../../shared/model/role.data";
import { DatasetFactory } from "./../../shared/services/dataset.factory";
import { UserFactory } from "./../../shared/services/user.factory";
import { Observable } from "rxjs/Rx";
import { TeamFactory } from "./../../shared/services/team.factory";
import { Component, Input, ViewChild, OnChanges, SimpleChanges, OnInit, EventEmitter, Output, ElementRef } from "@angular/core";
import { ModalComponent } from "ng2-bs3-modal/ng2-bs3-modal";
import { Initiative } from "../../shared/model/initiative.data"
import { Team } from "../../shared/model/team.data"
import "rxjs/add/operator/map";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/distinctUntilChanged";
import { NgbTypeaheadSelectItemEvent } from "@ng-bootstrap/ng-bootstrap";
import { User } from "../../shared/model/user.data";
import { _catch } from "rxjs/operator/catch";
import { _do } from "rxjs/operator/do";
import { switchMap } from "rxjs/operator/switchMap";
import { of } from "rxjs/observable/of";
import { map } from "rxjs/operator/map";
import { debounceTime } from "rxjs/operator/debounceTime";
import { distinctUntilChanged } from "rxjs/operator/distinctUntilChanged";
import { DataSet } from "../../shared/model/dataset.data";
import * as _ from "lodash";
import { Helper } from "../../shared/model/helper.data";

@Component({
    selector: "initiative",
    templateUrl: "./initiative.component.html",
    styleUrls: ["./initiative.component.css"]
})

export class InitiativeComponent implements OnChanges {

    @Output() edited: EventEmitter<boolean> = new EventEmitter<boolean>();

    @Input() node: Initiative;
    @Input() parent: Initiative;
    @Input() isReadOnly: boolean;
    @Input() datasetId: string;

    public members$: Promise<User[]>;
    public dataset$: Promise<DataSet>
    public team$: Promise<Team>;

    isTeamMemberFound: boolean = true;
    isTeamMemberAdded: boolean = false;
    currentTeamName: string;
    searching: boolean;
    searchFailed: boolean;
    hideme: Array<boolean> = [];

    @ViewChild("inputDescription") public element: ElementRef;

    constructor(private teamFactory: TeamFactory, private userFactory: UserFactory, private datasetFactory: DatasetFactory) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.node && changes.node.currentValue) {
            if (changes.node.isFirstChange() || !(changes.node.previousValue) || changes.node.currentValue.team_id !== changes.node.previousValue.team_id) {

                this.team$ = this.teamFactory.get(changes.node.currentValue.team_id).then(t => t, () => { return Promise.reject("No team available") }).catch(() => { })

                this.members$ = this.team$
                    .then((team: Team) => {
                        return this.userFactory.getUsers(team.members.map(m => m.user_id))
                            .then(members => _.compact(members))
                            .then(members => _.sortBy(members, m => m.name))
                    })
                    .catch(() => { })
            }

        }

        if (changes.datasetId && changes.datasetId.currentValue) {
            this.dataset$ = this.datasetFactory.get(changes.datasetId.currentValue).then(d => d, () => { return Promise.reject("no dataset") })
        }
    }

    ngOnInit() {

    }

    onBlur() {
        this.saveDescription(this.element.nativeElement.value)
        this.edited.emit(true);
    }

    saveName(newName: any) {
        this.node.name = newName;
    }

    saveDescription(newDesc: string) {
        this.node.description = newDesc;
    }

    saveRole(helper: Helper, description: string) {
        console.log(helper.name, description)
        if (helper.roles[0]) {
            helper.roles[0].description = description
        }
        else {
            helper.roles[0] = new Role({ description: description })
        }
    }

    toggleRole(i: number) {
        console.log(this.hideme)
        this.hideme.forEach(el => {
            el = true
        });
        this.hideme[i] = !this.hideme[i];
        console.log(this.hideme)
    }


    // saveStartDate(newDate: string) {
    //     let year = Number.parseInt(newDate.substr(0, 4));
    //     let month = Number.parseInt(newDate.substr(5, 2));
    //     let day = Number.parseInt(newDate.substr(8, 2));
    //     let parsedDate = new Date(year, month, day);

    //     // HACK : this should not be here but in a custom validatpr. Or maybe use HTML 5 "pattern" to prevent binding
    //     if (!Number.isNaN(parsedDate.valueOf())) {
    //         this.node.start = new Date(year, month, day);
    //     }
    // }

    saveAccountable(newAccountable: NgbTypeaheadSelectItemEvent) {
        this.node.accountable = newAccountable.item;
        this.onBlur();
    }

    saveHelper(newHelper: NgbTypeaheadSelectItemEvent) {
        if (this.node.helpers.findIndex(user => user.user_id === newHelper.item.user_id) < 0) {
            let helper = newHelper.item;
            helper.roles = [];
            this.node.helpers.unshift(helper);
        }

        this.onBlur();
    }

    removeHelper(helper: Helper) {
        let index = this.node.helpers.findIndex(user => user.user_id === helper.user_id);
        this.node.helpers.splice(index, 1);
        this.onBlur();
    }

    // isHelper(user: User): boolean {
    //     if (!this.node) return false;
    //     if (!this.node.helpers) return false;
    //     if (!user.user_id) return false;
    //     return this.node.helpers.findIndex(u => { return u.user_id === user.user_id }) !== -1
    // }

    // getPossibleHelpers(): Promise<User[]> {
    //     return this.team.then((team: Team) => {
    //         return team.members;
    //     })
    // }

    // isAuthority(user: User): boolean {
    //     if (!this.node) return false;
    //     if (!this.node.helpers) return false;
    //     if (!this.node.accountable) return false;
    //     if (!user) return false;
    //     if (!user.user_id) return false;
    //     return this.node.accountable.user_id === user.user_id;
    // }

    // addHelper(newHelper: Helper, checked: boolean) {
    //     newHelper.roles = [new Role({ description: "helping here and there" })]
    //     if (checked) {
    //         this.node.helpers.push(newHelper);
    //     }
    //     else {
    //         let index = this.node.helpers.findIndex(user => user.user_id === newHelper.user_id);
    //         this.node.helpers.splice(index, 1);
    //     }
    //     this.onBlur();
    // }

    filterMembers(term: string): Observable<User[]> {
        return term.length < 1
            ? Observable.from(this.members$)
            : Observable.from(this.members$.then(members => members.filter(v => new RegExp(term, "gi").test(v.name) || new RegExp(term, "gi").test(v.email)).splice(0, 10)).catch())

    }

    removeAuthority() {
        this.node.accountable = undefined;
    }

    searchTeamMember = (text$: Observable<string>) =>
        _do.call(
            switchMap.call(
                _do.call(
                    distinctUntilChanged.call(
                        debounceTime.call(text$, 300)),
                    () => this.searching = true),
                (term: string) =>
                    _catch.call(
                        _do.call(
                            this.filterMembers(term)
                            , () => this.searchFailed = false),
                        () => {
                            this.searchFailed = true;
                            return of.call([]);
                        }
                    )
            ),
            () => this.searching = false);


    formatter = (result: User) => { return result.name };
}




