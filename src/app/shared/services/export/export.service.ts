import { RequestMethod } from "@angular/http";
import { Request } from "@angular/http";
import { Http } from "@angular/http";
import { RequestOptions, Headers } from "@angular/http";

import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Rx";
import { AuthHttp } from "angular2-jwt/angular2-jwt";
import { DataSet } from "../../model/dataset.data";
import { D3Service, D3 } from "d3-ng2-service";
import { sortBy } from "lodash";
import { Tag } from "../../../shared/model/tag.data";
import { upperFirst, lowerCase, toLower } from "lodash"

@Injectable()
export class ExportService {

    private d3: D3;
    constructor(d3Service: D3Service, private http: Http) {
        this.d3 = d3Service.getD3();
    }

    getReport(dataset: DataSet): Observable<string> {
        let list = this.d3.hierarchy(dataset.initiative).descendants(); // flatten with lodash if possible
        let exportString: string = "Depth,Initiative,Parent Initiative,Type,Person,Participants,Helpers,Tags";

        dataset.initiative.traverse(i => {
            let inList = list.find(l => l.data.id === i.id);
            let nbrHelpers = i.helpers.length;
            let nbrAll = nbrHelpers + (i.accountable ? 1 : 0);
            let tags = i.tags.map(t => t.name).join("/");

            exportString += `\n"${inList.depth}","${i.name}","${inList.parent.data.name}","${upperFirst(toLower(dataset.team.settings.authority))}","${i.accountable ? i.accountable.name : ""}","${nbrAll}","${nbrHelpers}","${tags}"`
            sortBy(i.helpers, "name").forEach(h => {
                exportString += `\n"${inList.depth}","${i.name}","${inList.parent.data.name}","${upperFirst(toLower(dataset.team.settings.helper))}","${h.name}","${nbrAll}","${nbrHelpers}","${tags}"`
            })

        });
        return Observable.of(exportString);
    }

    getSnapshot(svgString: string, datasetId: string) {
        let headers = new Headers();
        headers.append("Content-Type", "text/html");
        headers.append("Accept", "text/html");
        let req = new Request({
            url: `/api/v1/images/upload/${datasetId}`,
            body: svgString,
            method: RequestMethod.Post,
            headers: headers
        });
        return this.http.request(req).map((responseData) => {
            return <string>responseData.json().secure_url;
        })
    }

    sendSlackNotification(svgString: string, datasetId: string, datasetName: string) {
        return this.getSnapshot(svgString, datasetId).map((imageUrl: string) => {
            console.log(imageUrl)
            let headers = new Headers();
            headers.append("Content-Type", "application/json");
            headers.append("Accept", "application/json");
            return new Request({
                url: `/api/v1/notifications/send/`,
                body: {
                    text: `Changes in ${datasetName}`,
                    title: `${datasetName} current initiatives`,
                    imageUrl: imageUrl.replace(".svg",".png"),
                    time: Date.now()
                },
                method: RequestMethod.Post,
                headers: headers
            })
        })
            .mergeMap(req => this.http.request(req))
    }

}
