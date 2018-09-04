import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BillingService } from '../../../../shared/services/billing/billing.service';
import { ActivatedRoute } from '@angular/router';
import { Team } from '../../../../shared/model/team.data';
import { DataSet } from '../../../../shared/model/dataset.data';
import { Permissions } from './../../../../shared/model/permission.data';
import { environment } from '../../../../../environment/environment';

@Component({
    selector: 'team-billing',
    templateUrl: './billing.component.html',
    styleUrls: ['./billing.component.css']
})
export class TeamBillingComponent implements OnInit {
    public team: Team;
    public remaningTrialDays: Number;
    public isLoading: boolean;
    public Permissions = Permissions;
    public KB_URL_INTEGRATIONS = environment.KB_URL_INTEGRATIONS;

    constructor(private route: ActivatedRoute, private billingService: BillingService, private cd: ChangeDetectorRef) { }

    ngOnInit(): void {
        this.isLoading = true;
        this.route.parent.data
            .flatMap((data: { assets: { team: Team, datasets: DataSet[] } }) => {
                return this.billingService.getTeamStatus(data.assets.team).map((value: { created_at: Date, freeTrialLength: Number, isPaying: Boolean }) => {
                    data.assets.team.createdAt = value.created_at;
                    data.assets.team.freeTrialLength = value.freeTrialLength;
                    data.assets.team.isPaying = value.isPaying;

                    return data.assets.team;
                })
            })
            .subscribe((team: Team) => {
                this.team = team;
                this.remaningTrialDays = team.getRemainingTrialDays();
                this.isLoading = false;
                this.cd.markForCheck();
            });

    }
}
