import { Injectable } from "@angular/core";
import { TeamFactory } from "../team.factory";
import { UserFactory } from "../user.factory";
import { User } from "../../model/user.data";
import { Team } from "../../model/team.data";
import { Angulartics2Mixpanel } from "../../../../../node_modules/angulartics2";
import { IntercomService } from "./intercom.service";

@Injectable()
export class TeamService {

    constructor(private teamFactory: TeamFactory, private userFactory: UserFactory,
        private analytics: Angulartics2Mixpanel, private intercomService: IntercomService) {

    }

    create(name: string, user: User, isTemporary?: boolean) {
        return this.teamFactory.create(new Team({
            name: name,
            members: [user],
            isTemporary: isTemporary,
            freeTrialLength: 14,
            isPaying: false
        }))
            .then((team: Team) => {
                user.teams.push(team.team_id);
                return this.userFactory.upsert(user)
                    .then((result: boolean) => {
                        if (result) {
                            if (!isTemporary) {
                                this.analytics.eventTrack("Create team", { email: user.email, name: name, teamId: team.team_id })

                            }
                        }
                        else {
                            throw `Unable to add you to organization ${name}!`
                        }
                    },
                        () => { throw `Unable to create organization ${name}!` })
                    .then(() => {
                        return team
                    })
            },
                () => { throw `Unable to create organization ${name}!` })
            .then((team: Team) => {
                return this.intercomService.createTeam(user, team).toPromise().then(result => {
                    if (result)
                        return team
                    else
                        throw "Cannot sync organization with Intercom."
                })

            })
    }

    createTemporary(user: User) {
        return this.create("", user, true);
    }
}