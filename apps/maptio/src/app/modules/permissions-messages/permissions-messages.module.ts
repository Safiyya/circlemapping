import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InsufficientPermissionsMessageComponent } from './insufficient-permissions-message.component';

@NgModule({
  declarations: [InsufficientPermissionsMessageComponent],
  imports: [CommonModule],
  exports: [InsufficientPermissionsMessageComponent],
})
export class PermissionsMessagesModule {}