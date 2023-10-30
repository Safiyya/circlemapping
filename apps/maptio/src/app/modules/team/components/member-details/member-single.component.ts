import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import { Angulartics2Mixpanel } from 'angulartics2/mixpanel';
import { Intercom } from '@supy-io/ngx-intercom';

import { User } from '@maptio-shared/model/user.data';
import { UserService } from '@maptio-shared/services/user/user.service';
import { MultipleUserDuplicationError } from '@maptio-shared/services/user/multiple-user-duplication.error';
import { UserRole, Permissions } from '@maptio-shared/model/permission.data';
import { Team } from '@maptio-shared/model/team.data';
import { DuplicationError } from '@maptio-shared/services/user/duplication.error';
import { KeysPipe } from '../../../../shared/pipes/keys.pipe';
import { MemberFormComponent } from '../../../member-form/member-form.component';
import { StickyPopoverDirective } from '../../../../shared/directives/sticky.directive';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgIf, NgFor, SlicePipe } from '@angular/common';
import { ConfirmationPopoverModule } from 'angular-confirmation-popover';
import { PermissionsDirective } from '../../../../shared/directives/permission.directive';

@Component({
  selector: 'maptio-member-single',
  templateUrl: './member-single.component.html',
  styleUrls: ['./member-single.component.css'],
  standalone: true,
  imports: [
    PermissionsDirective,
    ConfirmationPopoverModule,
    NgIf,
    NgbTooltipModule,
    NgFor,
    FormsModule,
    StickyPopoverDirective,
    MemberFormComponent,
    SlicePipe,
    KeysPipe,
  ],
})
export class MemberSingleComponent implements OnChanges {
  UserRole = UserRole;
  Permissions = Permissions;

  @Input() team: Team;
  @Input() member: User;
  @Input() user: User;
  @Input() isOnlyMember: boolean;

  @Output() delete = new EventEmitter<User>();

  memberRoleInOrganization: UserRole;

  isDisplaySendingLoader: boolean;
  isDisplayUpdatingLoader: boolean;
  isEditToggled: boolean;
  wasInvitationAttempted: boolean;

  duplicateUsers: User[] = [];

  errorMessage: string;

  constructor(
    private cd: ChangeDetectorRef,
    private userService: UserService,
    private analytics: Angulartics2Mixpanel,
    private intercom: Intercom
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes.member &&
      changes.team &&
      changes.member.currentValue &&
      changes.team.currentValue
    ) {
      this.memberRoleInOrganization = this.member.getUserRoleInOrganization(
        this.team.team_id
      );
    }
  }

  deleteMember() {
    this.delete.emit(this.member);
  }

  changeUserRole(userRoleString: string) {
    this.isDisplayUpdatingLoader = true;
    this.cd.markForCheck();

    const newUserRoleInOrganization = Number(userRoleString) as UserRole;

    this.userService
      .updateUserRole(this.member, this.team, newUserRoleInOrganization)
      .then(() => {
        this.isDisplayUpdatingLoader = false;
        this.cd.markForCheck();
      });
  }

  inviteUser(): Promise<void> {
    this.wasInvitationAttempted = true;

    if (!this.member.email) {
      this.errorMessage =
        'Please enter an email address to send the invitation to.';
      this.cd.markForCheck();
      return;
    }

    this.isDisplaySendingLoader = true;
    this.errorMessage = '';
    this.cd.markForCheck();

    return this.userService
      .sendInvite(this.member, this.team.name, this.user.name)
      .then((isSent) => {
        this.member.isInvitationSent = isSent;
        this.isDisplaySendingLoader = false;
        this.wasInvitationAttempted = false;
        this.cd.markForCheck();

        if (!isSent) {
          throw new Error();
        }

        return;
      })
      .then(() => {
        this.analytics.eventTrack('Team', {
          action: 'invite',
          team: this.team.name,
          teamId: this.team.team_id,
        });
        return;
      })
      .then(() => {
        this.intercom.trackEvent('Invite user', {
          team: this.team.name,
          teamId: this.team.team_id,
          email: this.member.email,
        });
        return;
      })
      .catch((error) => {
        console.error('Error while sending invitation: ', error);

        if (error instanceof DuplicationError) {
          this.handleDuplicateUsers(error.duplicateUsers);
        } else if (error instanceof MultipleUserDuplicationError) {
          this.errorMessage = `
            More than one user with this email already exists. This is
            unexpected. Please contact us and we will address this issue.
          `;
        } else {
          this.errorMessage = `
            Something went wrong. Please try again later or contact us if the
            problem persists.
          `;
        }

        this.isDisplaySendingLoader = false;
        this.cd.markForCheck();
      });
  }

  handleDuplicateUsers(duplicateUsers: User[]) {
    this.isEditToggled = true;
    this.duplicateUsers = duplicateUsers;
  }

  onEditMember() {
    this.onCancelEditing();
  }

  onCancelEditing() {
    this.isEditToggled = false;
    this.cd.markForCheck();
  }

  // TODO: Copy over to MemberForm component (and fix "Never ago"!!!)
  // import * as distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
  // getAgo(date: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  //   return date ? distanceInWordsToNow(date) : 'Never';
  // }
}
