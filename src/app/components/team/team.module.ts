import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationPopoverModule } from 'angular-confirmation-popover';
import { ANIMATION_TYPES, LoadingModule } from 'ngx-loading';
import { KeysPipe } from './../../pipes/keys.pipe';
import { AccessGuard } from './../../shared/services/guards/access.guard';
import { AuthGuard } from './../../shared/services/guards/auth.guard';
import { SharedModule } from './../../shared/shared.module';
import { TeamListComponent } from './list/team-list.component';
import { TeamListComponentResolver } from './list/team-list.resolver';
import { TeamImportComponent } from './single/import/import.component';
import { TeamMapsComponent } from './single/maps/maps.component';
import { TeamMembersComponent } from './single/members/members.component';
import { TeamSettingsComponent } from './single/settings/settings.component';
import { TeamComponent } from './single/team.component';
import { TeamComponentResolver } from './single/team.resolver';

const routes: Routes = [
    {
        path: "teams",
        data: { breadcrumbs: "Teams" },
        children: [
            {
                path: "", component: TeamListComponent, canActivate: [AuthGuard],
                resolve: {
                    teams: TeamListComponentResolver
                }
            },
            {
                path: ":teamid/:slug",
                resolve: {
                    assets: TeamComponentResolver
                },
                component: TeamComponent,
                data: { breadcrumbs: "{{assets.team.name}}" },
                canActivate: [AuthGuard, AccessGuard],
                children: [
                    { path: "", redirectTo: "members", pathMatch: "full" },
                    { path: "members", component: TeamMembersComponent, data: { breadcrumbs: true, text: "Members" } },
                    { path: "import", component: TeamImportComponent, data: { breadcrumbs: true, text: "Import" } },
                    { path: "maps", component: TeamMapsComponent, data: { breadcrumbs: true, text: "Maps" } },
                    { path: "settings", component: TeamSettingsComponent, data: { breadcrumbs: true, text: "Settings" } }
                ]
            }
        ]

    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule.forChild(routes),
        NgbModule.forRoot(),
        LoadingModule.forRoot({
            animationType: ANIMATION_TYPES.chasingDots,
            backdropBackgroundColour: "#fff",
            backdropBorderRadius: ".25rem",
            primaryColour: "#EF5E26",
            secondaryColour: "#2F81B7",
            tertiaryColour: "#ffffff"
        }),
        ConfirmationPopoverModule.forRoot({
            confirmButtonType: "danger",
            cancelButtonType: "secondary"
        }),
        SharedModule
    ],
    declarations: [
        TeamComponent,
        TeamListComponent,
        TeamMembersComponent,
        TeamSettingsComponent,
        TeamImportComponent,
        TeamMapsComponent,
        KeysPipe
    ],
    providers: [TeamComponentResolver, TeamListComponentResolver]
})
export class TeamModule { }