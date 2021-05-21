import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';

import { Observable, Subscription, interval } from 'rxjs';

import { environment } from './config/environment';

// import { ChangeDetectorRef, isDevMode } from '@angular/core';
// import 'rxjs/add/operator/map';
// import { Auth } from './core/authentication/auth.service';
// import { Intercom } from 'ng-intercom';
// import { NgProgress } from '@ngx-progressbar/core';
// import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  selector: 'maptio-root', // changed from maptio-app
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  // public isHome: boolean;
  // public isMap: boolean;

  // public navigationStartSubscription: Subscription;
  // public navigationOtherSubscription: Subscription;
  public checkTokenSubscription!: Subscription;

  constructor(
    // public auth: Auth,
    private router: Router,
    public progress: NgProgress,
    public intercom: Intercom,
    private deviceService: DeviceDetectorService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.checkTokenSubscription = interval(
      environment.CHECK_TOKEN_EXPIRATION_INTERVAL_IN_MINUTES * 60 * 1000
    )
      .timeInterval()
      .flatMap(() => {
        return Observable.of(this.auth.allAuthenticated());
      })
      .filter((isExpired) => !isExpired)
      .subscribe((isExpired: boolean) => {
        this.router.navigateByUrl('/logout');
      });

    this.intercom.boot({ app_id: environment.INTERCOM_APP_ID });

    window.onresize = (e: UIEvent) => {
      this.isMobile();
      this.cd.markForCheck();
    };
  }

  ngOnDestroy() {
    if (this.checkTokenSubscription) this.checkTokenSubscription.unsubscribe();
  }

  isMobile() {
    return this.deviceService.isMobile() || window.innerWidth < 500;
  }
}
