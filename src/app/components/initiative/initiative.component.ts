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
import { compact, sortBy } from "lodash";
import { Helper } from "../../shared/model/helper.data";
import { MarkdownService } from "angular2-markdown";

@Component({
    selector: "initiative",
    templateUrl: "./initiative.component.html",
    styleUrls: ["./initiative.component.css"]
})

export class InitiativeComponent implements OnChanges {

    @Output() edited: EventEmitter<boolean> = new EventEmitter<boolean>();

    @Input() node: Initiative;
    @Input() parent: Initiative;
    // @Input() isReadOnly: boolean;
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
    authorityHideMe: boolean;
    descriptionHideMe: boolean;
    cancelClicked: boolean;

    @ViewChild("inputDescription") public inputDescriptionElement: ElementRef;
    @ViewChild("inputRole") public inputRoleElement: ElementRef;
    @ViewChild("inputAuthorityRole") public inputAuthorityRole: ElementRef;

    constructor(private teamFactory: TeamFactory, private userFactory: UserFactory,
        private datasetFactory: DatasetFactory) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.node && changes.node.currentValue) {
            this.descriptionHideMe = changes.node.currentValue.description ? (changes.node.currentValue.description.trim() !== "") : false;
            if (changes.node.isFirstChange() || !(changes.node.previousValue) || changes.node.currentValue.team_id !== changes.node.previousValue.team_id) {

                this.team$ = this.teamFactory.get(changes.node.currentValue.team_id).then(t => t, () => { return Promise.reject("No team available") }).catch(() => { })

                this.members$ = this.team$
                    .then((team: Team) => {
                        return this.userFactory.getUsers(team.members.map(m => m.user_id))
                            .then(members => compact(members))
                            .then(members => sortBy(members, m => m.name))
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
        // console.log("saving", this.node)
        this.saveDescription(this.inputDescriptionElement.nativeElement.value)
        this.edited.emit(true);
    }

    saveName(newName: any) {
        this.node.name = newName;
    }

    saveDescription(newDesc: string) {
        this.node.description = newDesc;
    }

    saveRole(helper: Helper, description: string) {
        // console.log(helper.name, description)
        if (helper.roles[0]) {
            helper.roles[0].description = description
        }
        else {
            helper.roles[0] = new Role({ description: description })
        }
    }

    toggleRole(i: number) {
        this.hideme.forEach(el => {
            el = true
        });
        this.hideme[i] = !this.hideme[i];
    }

    saveAccountable(newAccountable: NgbTypeaheadSelectItemEvent) {
        let accountable = newAccountable.item;
        accountable.roles = [];
        if (this.inputAuthorityRole) accountable.roles[0] = new Role({ description: this.inputAuthorityRole.nativeElement.value });
        this.node.accountable = accountable;
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

    filterMembers(term: string): Observable<User[]> {
        return term.length < 1
            ? Observable.from(this.members$.then(ms => this.node.accountable ? ms.filter(m => m.user_id !== this.node.accountable.user_id) : ms))
            : Observable.from(this.members$.then(ms => this.node.accountable ? ms.filter(m => m.user_id !== this.node.accountable.user_id) : ms)
                .then(members => members.filter(v => new RegExp(term, "gi").test(v.name) || new RegExp(term, "gi").test(v.email)).splice(0, 10))
                .catch())

    }

    removeAuthority() {
        this.node.accountable = undefined;
        this.onBlur();
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




