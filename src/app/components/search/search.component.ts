import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter } from "@angular/core";
import { Initiative } from "../../shared/model/initiative.data";
import { NgbTypeaheadSelectItemEvent } from "@ng-bootstrap/ng-bootstrap";
import { Observable } from "rxjs/Observable";

@Component({
    selector: "search",
    templateUrl: "./search.component.html",
    styleUrls: ["./search.component.css"]
})
export class SearchComponent implements OnInit {
    @Input() list: Initiative[];
    @Output() selectInitiative: EventEmitter<Initiative> = new EventEmitter<Initiative>();

    constructor(private cd: ChangeDetectorRef) { }

    ngOnInit() { }

    public searchResultsCount: number;
    public isSearching: boolean;
    searchInitiatives = (text$: Observable<string>) =>
        text$
            .debounceTime(200)
            .distinctUntilChanged()
            .do((term: string) => {
                this.isSearching = true && term !== "";
                this.cd.markForCheck();
            })
            .map(term => {
                return term === ""
                    ? this.list
                    : this.list.filter(
                        v =>
                            v.name.toLowerCase().indexOf(term.toLowerCase()) > -1 ||
                            (v.description &&
                                v.description.toLowerCase().indexOf(term.toLowerCase()) >
                                -1) ||
                            (v.accountable &&
                                v.accountable.name.toLowerCase().indexOf(term.toLowerCase()) >
                                -1) ||
                            (v.helpers &&
                                v.helpers
                                    .map(h => h.name)
                                    .join("")
                                    .toLowerCase()
                                    .indexOf(term.toLowerCase()) > -1)
                    ).slice(0, 10);
            })
            .do(list => {
                this.searchResultsCount = list.length;
                this.cd.markForCheck();
            });

    formatter = (result: Initiative) => {
        return result.name;
    };

    zoomToInitiative(event: NgbTypeaheadSelectItemEvent) {
        let initiative = event.item;
        this.isSearching = false;
        this.cd.markForCheck();
        this.selectInitiative.emit(initiative)
        // this.zoomToInitiative$.next(initiative);
    }
}