import { URIService } from "../../../../shared/services/uri/uri.service";
import { DataService } from "../../services/data.service";
import { Browsers, UIService } from "../../services/ui.service";
import { ColorService } from "../../services/color.service";
import { Angulartics2Mixpanel } from "angulartics2/mixpanel";
import { Initiative } from "../../../../shared/model/initiative.data";
import { SelectableUser, User } from "../../../../shared/model/user.data";
import { SelectableTag, Tag } from "../../../../shared/model/tag.data";
import { IDataVisualizer } from "../../components/canvas/mapping.interface";
import { Observable, Subject, BehaviorSubject } from "rxjs/Rx";
import { Router, ActivatedRoute, Params } from "@angular/router";
import { Subscription } from "rxjs/Subscription";
import {
  Component,
  ViewEncapsulation,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  isDevMode,
  ElementRef
} from "@angular/core";
import { partition, cloneDeep, intersectionBy, isEmpty, compact } from "lodash-es";
import { LoaderService } from "../../../../shared/components/loading/loader.service";
import { Team } from "../../../../shared/model/team.data";
import * as screenfull from 'screenfull';

import { transition } from "d3-transition";
import { select, selectAll, event, mouse } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { scaleLog, ScaleLogarithmic } from "d3-scale";
import { HierarchyCircularNode, pack, hierarchy, HierarchyNode } from "d3-hierarchy";
import { min, thresholdFreedmanDiaconis } from "d3-array";
import { color } from "d3-color";
import { AuthHttp } from "angular2-jwt";
import { map, tap } from "rxjs/operators";
import { DataSet } from "../../../../shared/model/dataset.data";
import { of } from "rxjs";

const d3 = Object.assign(
  {},
  {
    transition,
    select,
    selectAll,
    mouse,
    min,
    zoom,
    zoomIdentity,
    scaleLog,
    pack,
    hierarchy,
    color,
    getEvent() { return require("d3-selection").event }
  }
)

@Component({
  selector: "zoomable",
  templateUrl: "./mapping.zoomable.component.html",
  styleUrls: ["./mapping.zoomable.component.css"],

  host: { 'class': 'padding-100 w-100 h-auto d-block position-relative' },
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MappingZoomableComponent implements IDataVisualizer {
  public datasetId: string;
  public width: number;
  public height: number;
  public translateX: number;
  public translateY: number;
  public scale: number;

  public margin: number;
  public zoom$: Observable<number>;
  public selectableTags$: Observable<Array<Tag>>;
  public selectableUsers$: Observable<Array<User>>;
  public isReset$: Observable<boolean>;
  public mapColor$: Observable<string>;
  public zoomInitiative$: Observable<Initiative>;

  public showDetailsOf$: Subject<Initiative> = new Subject<Initiative>();
  public showToolipOf$: Subject<{ initiatives: Initiative[], isNameOnly: boolean }> = new Subject<{ initiatives: Initiative[], isNameOnly: boolean }>();
  public showContextMenuOf$: Subject<{ initiatives: Initiative[], x: Number, y: Number, isReadOnlyContextMenu: boolean }> = new Subject<{ initiatives: Initiative[], x: Number, y: Number, isReadOnlyContextMenu: boolean }>();

  private zoomSubscription: Subscription;
  private dataSubscription: Subscription;
  private resetSubscription: Subscription;

  private zooming: any;

  public analytics: Angulartics2Mixpanel;

  public isWaitingForDestinationNode: boolean = false;
  public isTooltipDescriptionVisible: boolean = false;
  public isFirstEditing: boolean = false;
  public isLocked: boolean;
  public isLoading: boolean;

  public selectedNode: Initiative;
  public selectedNodeParent: Initiative;
  public hoveredNode: Initiative;

  public initiative: Initiative;
  public isNoMatchingCircles: boolean;
  public mission: string;


  private _lastZoomedCircle: any;
  public isShowMission: boolean;

  TRANSITION_DURATION = 500;

  constructor(
    public uiService: UIService,
    public router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    private loaderService: LoaderService,
    private http: AuthHttp,
    private element: ElementRef
  ) {
  }


  public get lastZoomedCircle(): string {
    return this._lastZoomedCircle;
  }


  public set lastZoomCircle(v: any) {
    this._lastZoomedCircle = v;
  }




  public setIsShowMission(v: boolean) {
    this.isShowMission = v;
    this.cd.markForCheck();
  }



  ngOnInit() {
    this.loaderService.show();
    this.dataSubscription = this.dataService
      .get()
      .do((data) => {
        this.isNoMatchingCircles = false;
        this.analytics.eventTrack("Map", {
          action: "viewing",
          view: "initiatives",
          team: (<Team>data.team).name,
          teamId: (<Team>data.team).team_id
        });
      })
      .map(data => {
        this.initiative = data.initiative.children[0];
        return data.dataset;
      })
      .combineLatest(this.mapColor$, this.selectableTags$, this.selectableUsers$)
      .flatMap((data: [DataSet, string, SelectableTag[], SelectableUser[]]) => {
        document.querySelector("svg") && document.querySelector("svg").classList.add("loading");

        let filtered = this.filterByTags(data[0].initiative.children[0], data[2], data[3]);
        if (!filtered) {

          document.querySelector(".map-container").innerHTML = "";
          this.isNoMatchingCircles = true;
          this.cd.markForCheck();
          // return this.draw(data[0].initiative.children[0], data[1], this.height, this.width)
        } else {
          return this.draw(filtered, data[1], this.height, this.width)
        }
      })
      .subscribe((result: { svg: string, root: any, nodes: any }) => {

        document.querySelector(".map-container").innerHTML = result.svg;
        this.hydrate(result.root, result.nodes);
        this.mission = result.root.data.name;

        document.querySelector("svg") && document.querySelector("svg").classList.remove("loading");

        this.loaderService.hide();

        this.isLoading = false;
        this.cd.markForCheck();
      },
        (err) => {
          if (!isDevMode) {
            console.error(err)
          }
        }

      )
      ;
  }

  draw(data: Initiative, color: string, diameter: number, width: number) {
    const pack = d3
      .pack()
      .size([this.height - this.margin, this.height - this.margin])
      .padding(20);

    let root = d3.hierarchy(data)
      .sum(function (d) {
        return (d.accountable ? 1 : 0) + (d.helpers ? d.helpers.length : 0) + 1;
      })
      .sort(function (a, b) {
        return b.value - a.value;
      })
    let nodes = pack(root).descendants();

    return this.http.post("/api/v1/charts/make", {
      initiative: data,
      color: color,
      width: width,
      diameter: diameter
    }).pipe(
      map(responseData => {
        return {
          svg: responseData.text(),
          root: root,
          nodes: nodes
        }
      })
    )
  }

  filterByTags(initiative: Initiative, tags: Tag[], users: User[]): Initiative {

    /*
    Observe that the task has a recursive structure: applying it to any branch of a tree does to the branch the same thing that you want to do to the entire tree
A branch could be either pruned, or removed entirely
Your recursive implementation would return a pruned branch; it would signal branch removal by returning null
The recursive function would check the incoming Node
If the node represents a leaf, its content would be checked against the list of items that we wish to keep
If a leaf is not on the "keep list", return null; otherwise return the leaf
For non-leaf branches call the recursive method, and examine its result
If the result is null, remove the corresponding branch from the map; otherwise, replace the branch with the pruned branch returned from the call
If upon examining all branches the map of child nodes is empty, return null
*/
    // const selectedTags = tags.filter(t => !!t.isSelected);
    // const selectedUsers = users.filter(u => !!u.isSelected);
    if (isEmpty(tags.length) && isEmpty(users)) return initiative;

    let clone = cloneDeep(initiative);
    const isMatchingTags = (node: Initiative): boolean => {
      // if (isEmpty(node.tags)) {
      //   return false;
      // } else {
      //   return intersectionBy(selectedTags, node.tags, t => t.shortid).length > 0;
      // }

      let isMatchTags = (isEmpty(node.tags))
        ? false
        : intersectionBy(tags, node.tags, t => t.shortid).length > 0;

      let isMatchUser = intersectionBy(users, node.getAllParticipants(), u => u.shortid).length > 0;

      return isMatchTags || isMatchUser;
    }

    function isAliveBranch(node: Initiative): Initiative {
      if (isEmpty(compact(node.children))) {
        // node is a leaf
        if (!isMatchingTags(node)) {
          // node to be removed
          return null;
        } else {
          return node;
        }
      }
      else {
        // node is a branch
        node.children.forEach((child, index) => {
          let result = isAliveBranch(child);
          if (!result) {
            delete node.children[index];
          }
          else {
            node.children.splice(index, 1, result);
          }
        });
        if (isEmpty(compact(node.children))) {

          if (isMatchingTags(node)) {
            node.children = [];
            return node;

          } else {

            return null;
          }

        }
        node.children = compact(node.children);
        return node;
      }
    }

    let result = isAliveBranch(clone);

    return result;

  }

  init() {

  }

  hydrate(root: any, nodes: any[]) {
    const svg = d3.select("svg");
    const g = d3.select("svg > g");
    const margin = 20;
    const height = this.height;
    const width = this.width;
    const TRANSITION_DURATION = this.TRANSITION_DURATION;
    const showToolipOf$ = this.showToolipOf$;
    const showContextMenuOf$ = this.showContextMenuOf$;
    const uiService = this.uiService;
    const router: Router = this.router;
    const route: ActivatedRoute = this.route;
    let view: any;
    let lastZoomCircle = this.lastZoomCircle;
    let setIsShowMission = this.setIsShowMission.bind(this);
    const node = g.selectAll("g.node").data(nodes, function (d: any) { return d ? d.data.id : d3.select(this).attr("id") || null });
    const circle = g.selectAll("circle.node").data(nodes, function (d: any) { return d ? d.data.id : d3.select(this).attr("id") || null });;
    const text = g.selectAll("foreignObject.name").data(nodes, function (d: any) { return d ? d.data.id : d3.select(this).attr("id") || null });;

    d3.select("body").select("div.member-tooltip").remove();
    let tooltip = d3.select("body").append("div");
    tooltip.attr("class", "member-tooltip").style("opacity", 0);

    text.selectAll("span.member-picture")
      .on("click", (d: any, index: number, elements: Array<HTMLElement>) => {
        let shortId = elements[index].getAttribute("data-member-shortid");
        router.navigate(["../directory"], { relativeTo: route, queryParams: { member: shortId } });
        d3.getEvent().stopPropagation();
      })
      .on("mouseover", (d: any, index: number, elements: Array<HTMLElement>) => {
        let name = elements[index].getAttribute("data-member-name");
        tooltip.text(name);
        tooltip.style("opacity", 1).style("left", (d3.getEvent().pageX) + "px")
          .style("top", (d3.getEvent().pageY - 28) + "px");;
      })
      .on("mouseout", (d: any, index: number, elements: Array<HTMLElement>) => {
        let name = elements[index].getAttribute("data-member-name");
        tooltip.text(name);
        tooltip.style("opacity", 0);
      })

    svg.style("padding-left", `calc(50% - ${this.height / 2}px)`);

    const wheelDelta = () => -d3.getEvent().deltaY * (d3.getEvent().deltaMode ? 120 : 1) / 500 * 10.5;
    const zooming = d3
      .zoom()
      .scaleExtent([1, 10])
      .wheelDelta(wheelDelta)
      .on("zoom", zoomed);

    function zoomed() {
      g.attr("transform", d3.getEvent().transform);
    }

    function passingThrough(el: any, eventName: string) {
      if (eventName == "contextmenu") {
        el.on("contextmenu", function (d: any): void {
          d3.getEvent().preventDefault();
          let mouse = d3.mouse(this);
          d3.select(`circle.node[id="${d.data.id}"]`).dispatch("contextmenu", { bubbles: true, cancelable: true, detail: { position: [mouse[0], mouse[1]] } });
        })
      } else {
        el
          .on(eventName, function (d: any): void {
            d3.select(`circle.node[id="${d.data.id}"]`).dispatch(eventName);
          })
      }
    }


    function getViewScaleForRadius(radius: number): number {
      return (height) / (radius * 2 + margin);
    }

    function getClickedElementCoordinates(clickedElement: any, newScale: number, translateX: number, translateY: number): Array<number> {

      let clickedX = 0;
      let clickedY = 0;
      if (
        clickedElement
        && clickedElement.transform
        && (clickedElement.transform.baseVal.length > 0 || clickedElement.transform.baseVal.numberOfItems > 0)
      ) {
        clickedX = clickedElement.transform.baseVal.getItem(0).matrix.e * newScale;
        clickedY = clickedElement.transform.baseVal.getItem(0).matrix.f * newScale;
        clickedX -= margin;
        clickedY -= margin;
      }
      else {
        // in case we are zooming prgramatically and the svg doesnt have the reference to transform

        clickedX = translateX * newScale;
        clickedY = translateY * newScale;
        clickedX -= margin;
        clickedY -= margin;
      }
      return [clickedX, clickedY];
    }

    function initMapElementsAtPosition(v: any) {
      // debugger
      // console.log(v)
      view = v;
      node
        .style("opacity", 0)
        .transition()
        .duration(TRANSITION_DURATION)
        .attr("transform", (d: any): string => `translate(${d.x - v[0]}, ${d.y - v[1]})`)
        .style("opacity", 0)
        .transition()
        .duration(TRANSITION_DURATION * 2)
        .style("opacity", 1)
        .each((d: any) => (d.translateX = d.x - v[0]))
        .each((d: any) => (d.translateY = d.y - v[1]))

      // node.on("mouseover", (d: any) => {
      //   revealCandidates = d.children;
      //   d3.getEvent().stopPropagation();
      // })

      text
        .on("click", function (d: any) {
          d3.select(`circle.node[id="${d.data.id}"]`).dispatch("click")
          d3.getEvent().stopPropagation();
        })
        .call(passingThrough, "contextmenu");




      circle
        .attr("r", function (d: any) {
          return d.r;
        })



    }

    function zoom(focus: any, clickedElement?: any): void {
      lastZoomCircle = focus;

      const newScale: number = focus === root /*|| focus.parent === root*/ ? 1 : getViewScaleForRadius(focus.r);
      const coordinates: Array<number> = getClickedElementCoordinates(clickedElement, newScale, focus.translateX, focus.translateY);
      svg.transition().duration(TRANSITION_DURATION).call(
        <any>zooming.transform,
        d3.zoomIdentity.translate(
          view[0] - coordinates[0],
          view[1] - coordinates[1]
        )
          .scale(newScale)
      );

      node
        .style("pointer-events", function (d: any) {
          if (d === root) return "visible";
          if (d === focus || d.parent === focus || focus.parent === d.parent || focus.parent === d) return "all";
          return "none";
        })

      circle
        .transition().duration(TRANSITION_DURATION / 2)
        .style("opacity", function (d: any) {
          if (d === focus || d.parent === focus) return 1;
          return 0.15;
        })

      text
        .transition().duration(TRANSITION_DURATION / 2)
        .style("display", function (d: any) {
          if (d === root) return "none";
          return d.parent === focus || d === focus || focus.parent === d.parent ? "inline"
            : "none"
        })
        .style("opacity", function (d: any) {
          return d === focus && d.children ? 0 : 1;
        });
    }

    circle
      .on("click", function (d: any, index: number, elements: Array<HTMLElement>): void {
        showToolipOf$.next({ initiatives: [d.data], isNameOnly: false });

        node.classed("highlighted", false);
        if (lastZoomCircle.data.id === d.data.id) { //zoom out
          lastZoomCircle = root;
          zoom(root);
          localStorage.removeItem("node_id");
          setIsShowMission(true);

        } else { //zoom in
          lastZoomCircle = d;
          localStorage.setItem("node_id", d.data.id)
          zoom(d, (<any>this).parentElement);
          setIsShowMission(false);

        }

        d3.getEvent().stopPropagation();
      })
      .on("contextmenu", function (d: any) {
        d3.getEvent().preventDefault();
        const that = <any>this;
        let mousePosition;

        if (Number.isNaN(d3.mouse(that)[0]) || Number.isNaN(d3.mouse[1])) {
          mousePosition = d3.getEvent().detail.position
        }
        else {
          mousePosition = d3.mouse(that);
        }
        let matrix = that.getCTM().translate(
          +that.getAttribute("cx"),
          +that.getAttribute("cy")
        );

        let mouse = { x: mousePosition[0] + 3, y: mousePosition[1] + 3 }
        let initiative = d.data;
        let circle = d3.select(that);
        showContextMenuOf$.next({
          initiatives: [initiative],
          x: uiService.getContextMenuCoordinates(mouse, matrix).x,
          y: uiService.getContextMenuCoordinates(mouse, matrix).y,
          isReadOnlyContextMenu: false
        });

        d3.select(".context-menu")
          .on("mouseenter", function (d: any) {
            showContextMenuOf$.next({
              initiatives: [initiative],
              x: uiService.getContextMenuCoordinates(mouse, matrix).x,
              y: uiService.getContextMenuCoordinates(mouse, matrix).y,
              isReadOnlyContextMenu: false
            });
            circle.dispatch("mouseover");
          })
          .on("mouseleave", function (d: any) {
            showContextMenuOf$.next({
              initiatives: null,
              x: 0,
              y: 0,
              isReadOnlyContextMenu: false
            });
            circle.dispatch("mouseout");
          })
      });

    lastZoomCircle = root;
    svg
      .on("click", (): void => {
        localStorage.removeItem("node_id");
        showToolipOf$.next({ initiatives: [root.data], isNameOnly: false });

        zoom(root);
        setIsShowMission(true);
        d3.getEvent().stopPropagation();
      })
    initMapElementsAtPosition([root.x, root.y])

    try {
      // the zoom generates an DOM Excpetion Error 9 for Chrome (not tested on other browsers yet)

      svg.call(
        zooming.transform,
        d3.zoomIdentity
          // .translate(width / 2, height / 2 )
          .scale(1)
      );
      svg.call(zooming);
    } catch (error) { console.error(error); }


    if (localStorage.getItem("node_id")) {
      let id = localStorage.getItem("node_id");
      if (lastZoomCircle.data.id.toString() === id.toString()) return;
      svg.select(`circle.node[id="${id}"]`).dispatch("click");
    } else {
      svg.dispatch("click")
    }

    this.zoomInitiative$.subscribe(zoomedNode => {
      if (!node) {
        svg.dispatch("click");
        return;
      }

      let zoomedId = zoomedNode.id;
      let parent = nodes.find(n => n.data.id === zoomedId).parent;
      localStorage.setItem("node_id", zoomedId.toString());

      if (parent.data.id === root.data.id && isEmpty(zoomedNode.children)) {
        svg.select(`circle.node[id="${zoomedId.toString()}"]`).dispatch("click");
      }
      else {
        if (lastZoomCircle.data.id !== parent.data.id) {
          svg.select(`circle.node[id="${parent.data.id}"]`).dispatch("click");
        }
      }

      node.classed("highlighted", false);
      svg.select(`g.node[id="${zoomedId}"]`).classed("highlighted", true);
      showToolipOf$.next({ initiatives: [zoomedNode], isNameOnly: false });


    })
  }

  ngOnDestroy() {
    if (this.zoomSubscription) {
      this.zoomSubscription.unsubscribe();
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.resetSubscription) {
      this.resetSubscription.unsubscribe();
    }
  }


}
