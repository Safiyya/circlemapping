import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { SanitizerModule } from '@maptio-shared/sanitizer.module';
import { LoginModule } from '@maptio-login/login.module';

import { CheckoutComponent } from './checkout/checkout.page';
import { PricingComponent } from './pricing/pricing.page';
import { PricingInfoComponent } from './pricing-info/pricing-info.component';
import { PricingSelectionComponent } from './pricing-selection/pricing-selection.component';
import { PaymentRoutingModule } from './payment.routing';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    SanitizerModule,
    PaymentRoutingModule,
    LoginModule,
    CheckoutComponent,
    PricingComponent,
    PaymentPlanComponent,
  ],
  providers: [],
})
export class PaymentModule {}
