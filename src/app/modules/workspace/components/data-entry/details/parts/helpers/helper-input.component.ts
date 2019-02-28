import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, SimpleChanges } from '@angular/core';
import { Helper } from '../../../../../../../shared/model/helper.data';
import { Team } from '../../../../../../../shared/model/team.data';
import { Role } from '../../../../../../../shared/model/role.data';

@Component({
    selector: 'initiative-helper-input',
    templateUrl: './helper-input.component.html',
    // styleUrls: ['./helper-input.component.css']
})
export class InitiativeHelperInputComponent implements OnInit {
    @Input("helper") helper: Helper;
    @Input("team") team: Team;
    @Input("summaryUrl") summaryUrl: string;
    @Input("isAuthority") isAuthority: boolean;

    @Output("remove") remove: EventEmitter<Helper> = new EventEmitter<Helper>();
    @Output("save") save :EventEmitter<void> = new EventEmitter<void>();

    placeholder:string;
    cancelClicked:boolean;

    constructor(private cd: ChangeDetectorRef) { }

    ngOnInit(): void { }

    ngOnChanges(changes:SimpleChanges){
        if(changes.helper && changes.helper.currentValue){
            this.placeholder = `How is ${changes.helper.currentValue.name} helping?`
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

    onChangeRole(description: string) {
        // console.log(this.helper.name, description)
        if (this.helper.roles[0]) {
            this.helper.roles[0].description = description;
        }
        else {
            this.helper.roles[0] = new Role({ description: description })
        }
        this.save.emit();
        this.cd.markForCheck();
    }

}
