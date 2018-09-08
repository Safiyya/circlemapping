import "rxjs/add/operator/map";

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactory,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Angulartics2Mixpanel } from "angulartics2";
import { compact } from "lodash";
import { BehaviorSubject, ReplaySubject, Subject, Subscription } from "rxjs/Rx";

import { saveAs } from "file-saver"
import { Initiative } from "./../../../shared/model/initiative.data";
import { SelectableTag, Tag } from "./../../../shared/model/tag.data";
import { Team } from "./../../../shared/model/team.data";
import { DataService } from "./../../../shared/services/data.service";
import { UIService } from "./../../../shared/services/ui/ui.service";
import { URIService } from "./../../../shared/services/uri.service";
import { IDataVisualizer } from "./mapping.interface";
import { MemberSummaryComponent } from "./member-summary/member-summary.component";
import { MappingNetworkComponent } from "./network/mapping.network.component";
import { MappingTreeComponent } from "./tree/mapping.tree.component";
import { MappingZoomableComponent } from "./zoomable/mapping.zoomable.component";
import { ExportService } from "./../../../shared/services/export/export.service";

// import { MappingNetworkComponent } from "./network/mapping.network.component";
// import { MappingCirclesComponent } from "./circles/mapping.circles.component";


declare var canvg: any;

@Component({
  selector: "mapping",
  templateUrl: "./mapping.component.html",
  styleUrls: ["./mapping.component.css"],
  entryComponents: [
    MappingTreeComponent,
    MappingNetworkComponent,
    MemberSummaryComponent,
    MappingZoomableComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MappingComponent {
  isFirstEdit: boolean;
  PLACEMENT: string = "left";
  TOGGLE: string = "tooltip";
  TOOLTIP_PEOPLE_VIEW: string = "People view";
  TOOLTIP_INITIATIVES_VIEW: string = "Initiatives view";
  TOOLTIP_ZOOM_IN: string = "Zoom in";
  TOOLTIP_ZOOM_OUT: string = "Zoom out";
  TOOLTIP_ZOOM_FIT: string = "Zoom fit";

  public data: {
    initiative: Initiative;
    datasetId: string;
    teamName: string;
    teamId: string;
  };
  public x: number;
  public y: number;
  public scale: number;
  // public isLocked: boolean = true;

  //   public isCollapsed: boolean = true;
  //   public isSettingsPanelCollapsed: boolean = true;
  //   public isTagSettingActive: boolean;
  public isSettingToggled: boolean;
  public isSearchToggled: boolean;

  public zoom$: Subject<number>;
  public isReset$: Subject<boolean>;
  public selectableTags$: Subject<Array<SelectableTag>>;
  // public selectableUsers$: Subject<Array<SelectableUser>>;

  public VIEWPORT_WIDTH: number = window.innerWidth-100;
  public VIEWPORT_HEIGHT: number = window.innerHeight-125;

  public isLoading: boolean;
  public datasetId: string;
  public datasetName: string;
  public initiative: Initiative;
  public flattenInitiative: Initiative[] = [];
  public team: Team;
  public slug: string;
  public tags: Array<SelectableTag>;
  public tagsFragment: string;
  public fontSize$: BehaviorSubject<number>;
  public fontColor$: BehaviorSubject<string>;
  public mapColor$: BehaviorSubject<string>;

  public zoomToInitiative$: Subject<Initiative>;
  public closeEditingPanel$: BehaviorSubject<boolean>;
  public data$: Subject<{ initiative: Initiative; datasetId: string }>;

  @Input("tags") selectableTags: Array<SelectableTag>;
  @Output("showDetails") showDetails = new EventEmitter<Initiative>();
  @Output("addInitiative") addInitiative = new EventEmitter<Initiative>();
  @Output("removeInitiative") removeInitiative = new EventEmitter<Initiative>();
  @Output("moveInitiative")
  moveInitiative = new EventEmitter<{
    node: Initiative;
    from: Initiative;
    to: Initiative;
  }>();
  @Output("closeEditingPanel") closeEditingPanel = new EventEmitter<boolean>();
  @Output("openTreePanel") openTreePanel = new EventEmitter<boolean>();
  @Output("expandTree") expandTree = new EventEmitter<boolean>();
  @Output("toggleSettingsPanel")
  toggleSettingsPanel = new EventEmitter<boolean>();
  @Output("applySettings")
  applySettings = new EventEmitter<{ initiative: Initiative; tags: Tag[] }>();

  public componentFactory: ComponentFactory<IDataVisualizer>;
  // public layout: string;
  public subscription: Subscription;
  public instance: IDataVisualizer;


  fontColor = localStorage.getItem("FONT_COLOR")
    ? localStorage.getItem("FONT_COLOR")
    : "#000";
  mapColor = localStorage.getItem("MAP_COLOR")
    ? localStorage.getItem("MAP_COLOR")
    : "#f8f9fa";
  fontSize = Number.parseFloat(localStorage.getItem("FONT_SIZE"))
    ? Number.parseFloat(localStorage.getItem("FONT_SIZE"))
    : 1;

  isFiltersToggled: boolean = false;
  isSearchDisabled: boolean = false;

  constructor(
    private dataService: DataService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private analytics: Angulartics2Mixpanel,
    private uriService: URIService,
    private uiService: UIService,
    private exportService: ExportService
  ) {
    this.zoom$ = new Subject<number>();
    this.isReset$ = new Subject<boolean>();
    this.selectableTags$ = new ReplaySubject<Array<SelectableTag>>();
    // this.selectableUsers$ = new ReplaySubject<Array<SelectableUser>>();
    this.fontSize$ = new BehaviorSubject<number>(this.fontSize);
    this.fontColor$ = new BehaviorSubject<string>(this.fontColor);
    this.mapColor$ = new BehaviorSubject<string>(this.mapColor);
    this.zoomToInitiative$ = new Subject();
    // this.isLocked$ = new BehaviorSubject<boolean>(this.isLocked);
    this.closeEditingPanel$ = new BehaviorSubject<boolean>(false);
    this.data$ = new Subject<{
      initiative: Initiative;
      datasetId: string;
    }>();


  }

  ngAfterViewInit() { }

  onActivate(component: IDataVisualizer) {

    component.showDetailsOf$.asObservable().subscribe(node => {
      this.showDetails.emit(node);
    });
    component.addInitiative$.asObservable().subscribe(node => {
      this.addInitiative.emit(node);
    });
    component.removeInitiative$.asObservable().subscribe(node => {
      this.removeInitiative.emit(node);
    });
    component.moveInitiative$
      .asObservable()
      .subscribe(({ node: node, from: from, to: to }) => {
        this.moveInitiative.emit({ node: node, from: from, to: to });
      });
    component.closeEditingPanel$.asObservable().subscribe((close: boolean) => {
      this.closeEditingPanel.emit(true);
    });

    let f = this.route.snapshot.fragment || this.getFragment(component);
    this.x = Number.parseFloat(this.uriService.parseFragment(f).get("x"));
    this.y = Number.parseFloat(this.uriService.parseFragment(f).get("y"));
    this.scale = Number.parseFloat(
      this.uriService.parseFragment(f).get("scale")
    );

    let tagsState =
      this.uriService.parseFragment(f).has("tags") &&
        this.uriService.parseFragment(f).get("tags")
        ? this.uriService
          .parseFragment(f)
          .get("tags")
          .split(",")
          .map(
            (s: string) => new SelectableTag({ shortid: s, isSelected: true })
          )
        : [];
    // let membersState = this.uriService.parseFragment(f).has("users") && this.uriService.parseFragment(f).get("users")
    //     ? this.uriService.parseFragment(f).get("users")
    //         .split(",")
    //         .map((s: string) => new SelectableUser({ shortid: s, isSelected: true }))
    //     : [];

    // this.layout = this.getLayout(component);

    component.width = this.VIEWPORT_WIDTH;
    component.height = this.VIEWPORT_HEIGHT;
    console.log("svg width", this.VIEWPORT_WIDTH, "screen width", window.screen.availWidth, "browser width", window.innerWidth)

    component.margin = 50;
    component.zoom$ = this.zoom$.asObservable();
    component.selectableTags$ = this.selectableTags$.asObservable();
    // component.selectableUsers$ = this.selectableUsers$.asObservable();
    component.fontSize$ = this.fontSize$.asObservable();
    component.fontColor$ = this.fontColor$.asObservable();
    component.mapColor$ = this.mapColor$.asObservable();
    component.zoomInitiative$ = this.zoomToInitiative$.asObservable();
    component.toggleOptions$ = this.toggleOptions$.asObservable();
    // component.isLocked$ = this.isLocked$.asObservable();
    component.translateX = this.x;
    component.translateY = this.y;
    component.scale = this.scale;
    component.tagsState = tagsState;
    this.selectableTags$.next(tagsState);
    // this.selectableUsers$.next(membersState)

    component.analytics = this.analytics;
    component.isReset$ = this.isReset$.asObservable();

    if (component.constructor === MemberSummaryComponent) {
      this.isSearchDisabled = true;
      this.isSearchToggled = false;
    }
    else {
      this.isSearchDisabled = false;
    }
  }

  onDeactivate(component: any) { }

  ngOnInit() {
    this.subscription = this.route.params
      .do(params => {
        this.datasetId = params["mapid"];
        this.slug = params["mapslug"];
        this.cd.markForCheck();
      })
      .combineLatest(this.dataService.get())
      .map(data => data[1])
      .combineLatest(this.route.fragment) // PEFORMACE : with latest changes
      .subscribe(([data, fragment]) => {
        if (!data.initiative.children || !data.initiative.children[0] || !data.initiative.children[0].children) {
          this.isFirstEdit = true;
          this.cd.markForCheck();
        }
        else {
          this.isFirstEdit = false;
          this.cd.markForCheck();
        }

        let fragmentTags =
          this.uriService.parseFragment(fragment).has("tags") &&
            this.uriService.parseFragment(fragment).get("tags")
            ? this.uriService
              .parseFragment(fragment)
              .get("tags")
              .split(",")
              .map(
                (s: string) =>
                  new SelectableTag({ shortid: s, isSelected: true })
              )
            : <SelectableTag[]>[];
        // let fragmentUsers = this.uriService.parseFragment(fragment).has("users") && this.uriService.parseFragment(fragment).get("users")
        //     ? this.uriService.parseFragment(fragment).get("users")
        //         .split(",")
        //         .map((s: string) => new SelectableUser({ shortid: s, isSelected: true }))
        //     : <SelectableUser[]>[];

        this.tags = compact<SelectableTag>(
          data.tags.map((dataTag: SelectableTag) => {
            let searchTag = fragmentTags.find(
              t => t.shortid === dataTag.shortid
            );
            return new SelectableTag({
              shortid: dataTag.shortid,
              name: dataTag.name,
              color: dataTag.color,
              isSelected: searchTag !== undefined
            });
          })
        );

        // this.members = _.compact<SelectableUser>(data.members.map((dataUser: SelectableUser) => {
        //     let searchUser = fragmentUsers.find(t => t.shortid === dataUser.shortid);
        //     return new SelectableUser({ shortid: dataUser.shortid, name: dataUser.name, picture: dataUser.picture, isSelected: searchUser !== undefined })

        // }));
        this.datasetName = data.initiative.name;
        this.initiative = data.initiative;
        this.team = data.team;
        this.flattenInitiative = data.initiative.flatten();
        this.cd.markForCheck();
      });

    this.route.fragment.subscribe(f => { });
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }

  getFragment(component: IDataVisualizer) {
    switch (component.constructor) {
      case MappingZoomableComponent:
        return `x=${this.VIEWPORT_WIDTH / 2}&y=${this.VIEWPORT_WIDTH / 2 - 180}&scale=1`;
      case MappingTreeComponent:
        return `x=${this.VIEWPORT_WIDTH / 10}&y=${this.VIEWPORT_HEIGHT / 2}&scale=1`;
      case MappingNetworkComponent:
        return `x=0&y=${-this.VIEWPORT_HEIGHT / 4}&scale=1`;
      case MemberSummaryComponent:
        return `x=0&y=0&scale=1`;
      default:
        return `x=${this.VIEWPORT_WIDTH / 2}&y=${this.VIEWPORT_HEIGHT /
          2}&scale=1`;
    }
  }


  public _toggleOptions: Boolean = false;
  public toggleOptions$: BehaviorSubject<Boolean> = new BehaviorSubject(this._toggleOptions)

  toggleOptions(isActive: Boolean) {
    this._toggleOptions = isActive ? !this._toggleOptions : false;
    this.toggleOptions$.next(this._toggleOptions)
  }

  zoomOut() {
    this.zoom$.next(0.9);
    this.analytics.eventTrack("Map", {
      action: "zoom out",
      mode: "button",
      team: this.team.name,
      teamId: this.team.team_id
    });
  }

  zoomIn() {
    this.zoom$.next(1.1);
    this.analytics.eventTrack("Map", {
      action: "zoom in",
      mode: "button",
      team: this.team.name,
      teamId: this.team.team_id
    });
  }

  resetZoom() {
    this.isReset$.next(true);
    this.analytics.eventTrack("Map", {
      action: "reset zoom",
      mode: "button",
      team: this.team.name,
      teamId: this.team.team_id
    });
  }

  changeFontSize(size: number) {
    this.fontSize$.next(size);
    localStorage.setItem("FONT_SIZE", `${size}`);
    this.analytics.eventTrack("Map", {
      action: "change font size",
      size: size,
      team: this.team.name,
      teamId: this.team.team_id
    });
  }

  changeFontColor(color: string) {
    this.fontColor$.next(color);
    localStorage.setItem("FONT_COLOR", `${color}`);
    this.fontColor = color;
    this.analytics.eventTrack("Map", {
      action: "change font color",
      color: color,
      team: this.team.name,
      teamId: this.team.team_id
    });
  }

  changeMapColor(color: string) {
    this.mapColor$.next(color);
    localStorage.setItem("MAP_COLOR", `${color}`);
    this.mapColor = color;
    this.analytics.eventTrack("Map", {
      action: "change map color",
      color: color,
      team: this.team.name,
      teamId: this.team.team_id
    });
  }

  addFirstNode() {
    this.addInitiative.emit(this.initiative);
    this.openTreePanel.emit(true);
    this.expandTree.emit(true);
    this.analytics.eventTrack("Map", { mode: "instruction", action: "add", team: this.team.name, teamId: this.team.team_id });
  }

  public broadcastTagsSettings(tags: SelectableTag[]) {
    // console.log("broadcast settings")
    this.applySettings.emit({ initiative: this.initiative, tags: tags });

  }

  public broadcastTagsSelection(tags: SelectableTag[]) {
    this.selectableTags$.next(tags);

    let tagsHash = tags
      .filter(t => t.isSelected === true)
      .map(t => t.shortid)
      .join(",");
    this.tagsFragment = `tags=${tagsHash}`;

    let ancient = this.uriService.parseFragment(this.route.snapshot.fragment);
    ancient.set("tags", tagsHash);
    location.hash = this.uriService.buildFragment(ancient);
  }

  zoomToInitiative(selected: Initiative) {
    this.zoomToInitiative$.next(selected);
  }

  sendSlackNotification(message: string) {
    this.isPrinting = true;
    this.hasNotified = false;
    this.cd.markForCheck()
    // this.zoom$.next(0.8);
    this.changeFontSize(1)

    let svg = document.getElementById("map");
    let w = Number.parseFloat(svg.getAttribute("width"));
    let h = Number.parseFloat(svg.getAttribute("height"));
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink")
    let svgNode = this.downloadSvg(svg, "image.png", w, h);
    // console.log(((<any>svgNode).outerHTML)
    this.exportService.sendSlackNotification((<any>svgNode).outerHTML, this.datasetId, this.initiative, this.team.slack, message)
      .subscribe((result) => {
        // console.log("result", result);
        this.isPrinting = false; this.hasNotified = true; this.cd.markForCheck()
      },
        (err) => {
          this.hasConfigurationError = true;
          this.cd.markForCheck();
        })

  }

  // print() {
  //   console.log("printing");
  //   // the canvg call that takes the svg xml and converts it to a canvas
  //   canvg("canvas", document.getElementById("svg_circles").outerHTML);

  //   // the canvas calls to output a png
  //   let canvas = document.getElementById("canvas");
  //   canvas.setAttribute("width", `${this.VIEWPORT_WIDTH}px`);
  //   canvas.setAttribute("height", `${this.VIEWPORT_HEIGHT}px`);
  //   let img = canvas.toDataURL("image/png");
  //   document.write("<img src=\"" + img + "\"/>");
  // }

  isPrinting: boolean;
  hasNotified: boolean;
  hasConfigurationError: boolean;
  isSharingToggled: boolean;

  // print() {
  //   this.isPrinting = true;
  //   this.cd.markForCheck()
  //   this.zoom$.next(0.8);
  //   this.changeFontSize(1)

  //   let svg = document.getElementById("svg_circles");
  //   let w = Number.parseFloat(svg.getAttribute("width"));
  //   let h = Number.parseFloat(svg.getAttribute("height"));
  //   svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  //   svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink")
  //   let svgNode = this.downloadSvg(svg, "image.png", w, h);
  //   console.log(svgNode.outerHTML)
  //   this.exportService.sendSlackNotification(svgNode.outerHTML, this.datasetId, this.datasetName, this.team.slack)
  //     .subscribe(() => { this.isPrinting = false; this.cd.markForCheck() })

  // }

  copyStylesInline(destinationNode: any, sourceNode: any) {
    let containerElements = ["svg", "g"];
    for (let cd = 0; cd < destinationNode.childNodes.length; cd++) {
      let child = destinationNode.childNodes[cd];
      // if (child.tagName === "foreignObject") {
      //   if (child.childNodes[0].tagName === "DIV") {
      //     let bodyChild = document.createElement("body");
      //     bodyChild.setAttribute("xmnls", "http://www.w3.org/1999/xhtml");
      //     let divChild = document.createElement("div");
      //     bodyChild.style.background = "none";
      //     bodyChild.style.overflow = "initial";
      //     bodyChild.style.display = "inline-block";
      //     bodyChild.style.lineHeight = "unset";
      //     let font = Number.parseFloat((<HTMLDivElement>child.childNodes[0]).style.fontSize.replace("rem", ""));
      //     let realFont = font / 16 < 1 ? "3px" : (<HTMLDivElement>child.childNodes[0]).style.fontSize
      //     bodyChild.style.fontSize = realFont;
      //     divChild.textContent = (<HTMLDivElement>child.childNodes[0]).textContent;
      //     bodyChild.appendChild(divChild);
      //     (<Node>child).replaceChild(bodyChild, child.childNodes[0])

      //   }
      // }
      if (containerElements.indexOf(child.tagName) !== -1) {
        this.copyStylesInline(child, sourceNode.childNodes[cd]);
        continue;
      }
      let style = sourceNode.childNodes[cd].currentStyle || window.getComputedStyle(sourceNode.childNodes[cd]);
      // console.log(style["fill"], )
      if (style === "undefined" || style == null) continue;
      for (let st = 0; st < style.length; st++) {
        if (style[st] === "display" && style.getPropertyValue(style[st]) === "none") {
          child.style.setProperty(style[st], "block");

        }
        else if (style[st] === "opacity" && style.getPropertyValue(style[st]) === "0") {
          child.style.setProperty(style[st], "1");
        }
        // else if (style["fill"].includes("url(")) {
        //   child.style.setProperty("display", "none")
        // }
        else {
          child.style.setProperty(style[st], style.getPropertyValue(style[st]));
        }
        // child.style.setProperty(style[st], style.getPropertyValue(style[st]));
      }
    }
  }

  triggerDownload(imgURI: string, fileName: string) {
    // console.log(imgURI)
    let evt = new MouseEvent("click", {
      view: window,
      bubbles: false,
      cancelable: true
    });
    let a = document.createElement("a");
    // a.setAttribute("download", fileName);
    a.setAttribute("href", imgURI);
    a.setAttribute("target", "_blank");
    a.dispatchEvent(evt);
  }

  downloadSvg(svg: HTMLElement, fileName: string, width: number, height: number): Node {
    let copy = svg.cloneNode(true);
    this.copyStylesInline(copy, svg);
    // console.log(copy)
    return copy;
    /*
        let canvas = document.createElement("canvas");
        let WIDTH = width * 2;
        let HEIGHT = height * 3;
        canvas.setAttribute("width", WIDTH + "px");
        canvas.setAttribute("height", HEIGHT + "px");
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        let data = (new XMLSerializer()).serializeToString(copy);
        let DOMURL: any = window.URL || window;
        let img = new Image();
        img.crossOrigin = "Anonymous";
        img.setAttribute("crossOrigin", "Anonymous")
        let svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
        img.src = "data:image/svg+xml;utf8," + data;
        canvas.getContext("2d").drawImage(img, 0, 0, WIDTH, HEIGHT);
        let url = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        this.triggerDownload(url, `${Date.now()}-image.png`)
        */
  }
}
