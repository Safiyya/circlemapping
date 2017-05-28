import { TeamComponent } from "./../team/team.component";
import { TeamFactory } from "./../../shared/services/team.factory";
import { EmitterService } from "./../../shared/services/emitter.service";
import { ErrorService } from "./../../shared/services/error/error.service";
import { Router } from "@angular/router";
import { DataSet } from "./../../shared/model/dataset.data";
import { DatasetFactory } from "./../../shared/services/dataset.factory";
import { User } from "./../../shared/model/user.data";
import { Auth } from "./../../shared/services/auth/auth.service";
import { Component, OnInit, ViewChild } from "@angular/core";
import { Team } from "../../shared/model/team.data";
import { UserFactory } from "../../shared/services/user.factory";

@Component({
    selector: "account",
    template: require("./account.component.html"),
    styles: [require("./account.component.css").toString()]
})
export class AccountComponent implements OnInit {

    private user: User;
    public datasets$: Promise<Array<DataSet>>;
    public teams$: Promise<Array<Team>>
    private message: string;

    @ViewChild(TeamComponent) teamComponent: TeamComponent;

    constructor(private auth: Auth, private datasetFactory: DatasetFactory, private teamFactory: TeamFactory, private userFactory: UserFactory, private router: Router, private errorService: ErrorService) {

    }

    ngOnInit() {

        this.refresh();
    }

    private refresh() {
        this.auth.getUser().subscribe(
            (user: User) => {
                this.user = user;

                this.teams$ = Promise.all(
                    this.user.teams.map(
                        team_id => this.teamFactory.get(team_id).then((resolved: Team) => { return resolved })
                    )
                )
                    .then(teams => { return teams });


                // datasets
                let ds = new Array<DataSet>();
                this.user.datasets.forEach(d => {
                    this.datasetFactory.get(d).then((resolved: DataSet) => {
                        ds.push(resolved)
                    })
                })
                this.datasets$ = Promise.resolve(ds);
            },
            (error: any) => { this.errorService.handleError(error) });
    }


    open(dataset: DataSet) {
        EmitterService.get("datasetName").emit(dataset.name);
        this.router.navigate(["workspace", dataset._id]);
    }

    deleteDataset(dataset: DataSet) {
        this.datasetFactory.delete(dataset, this.user).then((result: boolean) => {
            if (result) {
                this.message = "Dataset " + dataset.name + " was successfully deleted";
            }
            else {
                this.errorService.handleError(new Error("Dataset " + dataset.name + " cannot be deleted"));
            }
            this.refresh();
        });
    }

    createNewTeam(teamName: string) {
        this.teamFactory.create(new Team({ name: teamName, members: [this.user] })).then((team: Team) => {
            this.user.teams.push(team.team_id);
            this.userFactory.upsert(this.user).then((result: boolean) => {

            }).catch(err => { this.errorService.handleError(err) })
            this.refresh();
        }).catch(err => { this.errorService.handleError(err) })
    }
}