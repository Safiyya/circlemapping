import { BuildingComponent } from "../../components/data-entry/hierarchy/building.component";
import { DataService, CounterService } from "../../services/data.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Subscription, Subject } from "rxjs/Rx";
import { Initiative } from "../../../../shared/model/initiative.data";
import { DataSet } from "../../../../shared/model/dataset.data";
import { Team } from "../../../../shared/model/team.data";
import { EmitterService } from "../../../../core/services/emitter.service";
import { DatasetFactory } from "../../../../core/http/map/dataset.factory";
import { ViewChild } from "@angular/core";
import {
    Component, OnInit, OnDestroy,
    ChangeDetectorRef,
    ChangeDetectionStrategy
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { User } from "../../../../shared/model/user.data";
import { Tag } from "../../../../shared/model/tag.data";
import { UIService } from "../../services/ui.service";
import { Intercom } from "ng-intercom";

@Component({
    selector: "workspace",
    templateUrl: "workspace.component.html",
    styleUrls: ["./workspace.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush
})


export class WorkspaceComponent implements OnInit, OnDestroy {

    @ViewChild("building")
    buildingComponent: BuildingComponent

    public isBuildingPanelCollapsed: boolean = true;
    public isDetailsPanelCollapsed: boolean = true;
    public isBuildingVisible: boolean = true;
    public isEmptyMap: Boolean;
    public isSaving: Boolean;
    public isEditMode: boolean;
    // public isSettingsPanelCollapsed: boolean = true;
    public datasetId: string;
    private routeSubscription: Subscription;
    private userSubscription: Subscription;
    public isLoading: boolean;

    public dataset: DataSet;
    public members: Array<User>;
    public team: Team;
    public teams: Team[];
    public tags: Tag[];
    public user: User;
    public canvasYMargin: number;
    public canvasHeight: number

    public openedNode: Initiative;
    public openedNodeParent: Initiative;
    public openedNodeTeamId: string;
    public openEditTag$: Subject<void> = new Subject<void>();

    public mapped: Initiative;
    teamName: string;
    teamId: string;
    selectableTags: Array<Tag>;

    @ViewChild("dragConfirmation")
    dragConfirmationModal: NgbModal;

    ngOnDestroy(): void {
        EmitterService.get("currentTeam").emit(undefined)
        if (this.routeSubscription) this.routeSubscription.unsubscribe();
        if (this.userSubscription) this.userSubscription.unsubscribe();
    }

    constructor(private route: ActivatedRoute, private datasetFactory: DatasetFactory,
        private dataService: DataService, private cd: ChangeDetectorRef, private uiService: UIService, private intercom: Intercom) {

    }

    ngOnInit() {
        this.isLoading = true;
        this.cd.markForCheck();
        this.routeSubscription = this.route.data
            .do((data) => {
                let newDatasetId = data.data.dataset.datasetId;
                if (newDatasetId !== this.datasetId) {
                    this.closeDetailsPanel();
                    this.closeBuildingPanel();
                    this.cd.markForCheck()
                }
            })
            .do((data: { data: { dataset: DataSet, team: Team, members: User[], user: User } }) => {
                this.isLoading = true;
                this.cd.markForCheck();
                return this.buildingComponent.loadData(data.data.dataset, data.data.team, data.data.members)
                    .then(() => {
                        this.isLoading = false;
                        this.cd.markForCheck();
                    });
            })
            .subscribe((data: { data: { dataset: DataSet, team: Team, members: User[], user: User } }) => {

                this.dataset = data.data.dataset;
                this.tags = data.data.dataset.tags;
                this.team = data.data.team;
                this.members = data.data.members;
                this.user = data.data.user;
                this.datasetId = this.dataset.datasetId;
                this.teamName = this.team.name;
                this.teamId = this.team.team_id;
                EmitterService.get("currentTeam").emit(this.team);
                this.isEmptyMap = !this.dataset.initiative.children || this.dataset.initiative.children.length === 0;
                this.cd.markForCheck();
            });
    }


    saveDetailChanges() {
        this.buildingComponent.saveChanges();
    }

    // applySettings(data: { initiative: Initiative, tags: Tag[] }) {
    //     data.initiative.traverse((node: Initiative) => {
    //         node.tags = intersectionBy(data.tags, node.tags, (t: Tag) => t.shortid);
    //     })
    //     this.saveChanges(data.initiative, data.tags);
    //     this.cd.markForCheck();
    // }

    saveChanges(change: { initiative: Initiative, tags: Array<Tag> }) {
        this.isEmptyMap = !change.initiative.children || change.initiative.children.length === 0;
        this.isSaving = true;
        this.cd.markForCheck();

        this.dataset.initiative = change.initiative;
        this.dataset.tags = change.tags;
        this.tags = change.tags

        let depth = 0
        change.initiative.traverse((n) => { depth++ });

        this.datasetFactory.upsert(this.dataset, this.datasetId)
            .then((hasSaved: boolean) => {
                this.dataService.set({ initiative: change.initiative, dataset: this.dataset, team: this.team, members: this.members });
                return hasSaved;
            }, (reason) => { console.error(reason) })
            .then(() => {

                let depth = 0
                change.initiative.traverse((n) => { depth++ });
                this.buildingComponent.depth = depth;
                this.cd.markForCheck();
                this.intercom.trackEvent("Editing map", { team: this.team.name, teamId: this.team.team_id, datasetId: this.datasetId, mapName: change.initiative.name, circles: depth });
                return;
            })
            .then(() => {
                this.isSaving = false;
                this.cd.markForCheck();
            });
    }




    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.cd.markForCheck();
    }

    onOpenDetailsToView(node: Initiative) {
        this.openedNode = node;
        this.openDetailsPanel();
        this.isEditMode = false;
        this.cd.markForCheck();
    }


    onOpenDetailsToEdit(node: Initiative) {
        this.openedNode = node;
        this.openDetailsPanel();
        this.isEditMode = true;
        this.cd.markForCheck();
    }

    addInitiative(data: { node: Initiative, subNode: Initiative }) {
        this.buildingComponent.addNodeTo(data.node, data.subNode);
    }

    removeInitiative(node: Initiative) {
        this.buildingComponent.removeNode(node);
    }

    moveInitiative({ node, from, to }: { node: Initiative, from: Initiative, to: Initiative }) {
        this.buildingComponent.moveNode(node, from, to);
    }

    openDetailsPanel() {
        this.isDetailsPanelCollapsed = false;
        this.resizeMap();

    }

    closeDetailsPanel() {
        this.isDetailsPanelCollapsed = true;
        this.resizeMap();
    }

    closeBuildingPanel() {
        this.isBuildingPanelCollapsed = true;
        this.resizeMap();
    }

    openBuildingPanel() {
        this.isBuildingPanelCollapsed = false;
        this.resizeMap();
    }

    toggleEditingPanelsVisibility(isVisible: boolean) {
        this.isBuildingVisible = isVisible;
        this.cd.markForCheck();
    }

    onEditTags() {
        this.isBuildingPanelCollapsed = false;
        this.buildingComponent.tabs.select("tags-tab");
        this.cd.markForCheck();
    }

    // getCenteredMargin() {
    //     let outer = document.querySelector('svg#map').clientWidth;
    //     let inner = document.querySelector('svg#map > svg').getBoundingClientRect().width;
    //     if (inner > outer) {
    //         return "5%"
    //     } else {

    //         return inner == 0 ? "33%" : `${((outer - inner) / outer * 100 / 2)}%`
    //     }
    // }

    private resizeMap() {
        let outerSvg = document.querySelector("svg#map");
        let innerSvg = document.querySelector("svg#map > svg");
        if (!outerSvg || !innerSvg) return;

        if (this.isZeroPanelOpened()) {
            let margin = this.uiService.getCenteredMarginPercentage(33);
            innerSvg.setAttribute("x", `${margin}%`);
        }
        else {
            innerSvg.setAttribute("x", "33%");
        }
    }

    private isZeroPanelOpened() {
        return this.isBuildingPanelCollapsed && this.isDetailsPanelCollapsed;
    }

    private isOnePanelOpened() {
        return this.isBuildingPanelCollapsed !== this.isDetailsPanelCollapsed;
    }

    private isTwoPanelsOpened() {
        return !this.isDetailsPanelCollapsed && !this.isBuildingPanelCollapsed;
    }
}