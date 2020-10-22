import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, SimpleChanges } from "@angular/core";
import { Helper } from "../../../../../../../shared/model/helper.data";
import { Team } from "../../../../../../../shared/model/team.data";
import { Role } from "../../../../../../../shared/model/role.data";

@Component({
    selector: "initiative-helper-input",
    templateUrl: "./helper-input.component.html",
    styleUrls: ["./helper-input.component.css"],
})
export class InitiativeHelperInputComponent implements OnInit {
    @Input("helper") helper: Helper;
    @Input("team") team: Team;
    @Input("summaryUrlRoot") summaryUrlRoot: string;
    @Input("isAuthority") isAuthority: boolean;
    @Input("isUnauthorized") isUnauthorized: boolean;

    @Output("remove") remove: EventEmitter<Helper> = new EventEmitter<Helper>();
    @Output("save") save: EventEmitter<void> = new EventEmitter<void>();

    cancelClicked: boolean;
    isPickRoleMode = false;
    isCreateRoleMode = false;
    isEditRoleMode = false;

    newRole: Role;
    roleBeingEdited: Role;

    constructor(private cd: ChangeDetectorRef) { }

    ngOnInit(): void { }

    ngOnChanges(changes:SimpleChanges){
        if (changes.helper && changes.helper.currentValue) {
            if (this.isAuthority) this.helper.hasAuthorityPrivileges = true;
        }
    }

    onRemove() {
        this.remove.emit(this.helper);
    }

    onChangePrivilege(helper: Helper, hasAuthorityPrivileges: boolean) {
        this.helper.hasAuthorityPrivileges = hasAuthorityPrivileges;
        this.save.emit();
        this.cd.markForCheck();
    }

    onPickRole(roles: Role[]) {
        this.isPickRoleMode = false;
        this.helper.roles = roles;
        this.save.emit();
        this.cd.markForCheck();
    }

    onCreateRole(newRole: Role) {
        this.isPickRoleMode = false;
        this.isCreateRoleMode = true;
        this.newRole = newRole;
        this.cd.markForCheck();
    }

    onCancelCreatingNewRole() {
        this.isCreateRoleMode = false;
        this.newRole = undefined;
        this.cd.markForCheck();
    }

    onSaveNewRole() {
        this.helper.roles.unshift(this.newRole);
        this.isCreateRoleMode = false;
        this.newRole = undefined;
        this.save.emit();
        this.cd.markForCheck();
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
        this.save.emit();
        this.cd.markForCheck();
    }

    onRemoveRole(roleToBeRemoved: Role) {
        this.helper.roles = this.helper.roles.filter(role => role !== roleToBeRemoved)
        this.save.emit();
        this.cd.markForCheck();
    }

}
