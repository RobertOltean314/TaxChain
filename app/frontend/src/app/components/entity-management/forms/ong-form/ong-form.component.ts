import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CollapsibleComponent } from '../../../../shared/ui/collapsible/collapsible.component';
import { EntityManagementService } from '../../../../features/entity_management/services/entity-management.service';
import { MultiversxAuthService } from '../../../../core/services/multiversx-auth.service';
import {
  TipActIdentitate,
  CalitateReprezentant,
  TipONG,
  ONGRequest,
} from '../../../../features/entity_management/models/entitate_fiscala.models';

@Component({
  selector: 'app-ong-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    CollapsibleComponent,
  ],
  templateUrl: './ong-form.component.html',
  styleUrl: './ong-form.component.css',
})
export class OngFormComponent implements OnInit {
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  entityForm!: FormGroup;
  isLoading = false;

  TipActIdentitate = Object.values(TipActIdentitate);
  CalitateReprezentant = Object.values(CalitateReprezentant);
  TipONG = Object.values(TipONG);

  private fb = inject(FormBuilder);
  private entityService = inject(EntityManagementService);
  private authService = inject(MultiversxAuthService);

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.entityForm = this.fb.group({
      denumire: ['', Validators.required],
      cui: ['', Validators.required],
      nr_inregistrare: ['', Validators.required],
      tip_ong: [TipONG.Asociatie, Validators.required],
      domeniu_activitate: ['', Validators.required],
      data_infiintarii: ['', Validators.required],
      statut_utilitate_publica: [false],

      adresa_sediu: this.fb.group({
        tara: ['Romania', Validators.required],
        judet: ['', Validators.required],
        localitate: ['', Validators.required],
        cod_postal: [''],
        strada: ['', Validators.required],
        numar: ['', Validators.required],
        bloc: [''],
        scara: [''],
        etaj: [''],
        apartament: [''],
      }),

      reprezentant: this.fb.group({
        parent_id: ['00000000-0000-0000-0000-000000000000'],
        parent_type: ['ong'],
        nume: ['', Validators.required],
        prenume: ['', Validators.required],
        cnp: [
          '',
          [
            Validators.required,
            Validators.minLength(13),
            Validators.maxLength(13),
          ],
        ],
        tip_act_identitate: [
          TipActIdentitate.CarteIdentitate,
          Validators.required,
        ],
        serie_act_identitate: ['', Validators.required],
        numar_act_identitate: ['', Validators.required],
        calitate: [CalitateReprezentant.Proprietar, Validators.required],
        telefon: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        data_nasterii: ['', Validators.required],
        adresa_domiciliu: ['00000000-0000-0000-0000-000000000000'],
      }),
    });
  }

  onSubmit(): void {
    if (this.entityForm.invalid) {
      this.entityForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const walletAddress = this.authService.getAddress();
    const formData: ONGRequest = {
      ...this.entityForm.value,
      owner_wallet_address: walletAddress || '',
    };

    this.entityService.createONG(formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.entityForm.reset();
        this.initForm();
        this.formSubmitted.emit();
      },
      error: (error: unknown) => {
        this.isLoading = false;
        console.error('Error creating ONG:', error);
      },
    });
  }

  onCancel(): void {
    this.formCancelled.emit();
  }
}
