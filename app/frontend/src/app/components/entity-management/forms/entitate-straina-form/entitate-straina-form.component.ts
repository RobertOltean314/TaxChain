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
import {
  TipActIdentitate,
  CalitateReprezentant,
  EntitateStrainaRequest,
} from '../../../../features/entity_management/models/entitate_fiscala.models';

@Component({
  selector: 'app-entitate-straina-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    CollapsibleComponent,
  ],
  templateUrl: './entitate-straina-form.component.html',
  styleUrl: './entitate-straina-form.component.css',
})
export class EntitateStrainaFormComponent implements OnInit {
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  entityForm!: FormGroup;
  isLoading = false;

  TipActIdentitate = Object.values(TipActIdentitate);
  CalitateReprezentant = Object.values(CalitateReprezentant);

  private fb = inject(FormBuilder);
  private entityService = inject(EntityManagementService);

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.entityForm = this.fb.group({
      denumire: ['', Validators.required],
      tara_origine: ['', Validators.required],
      numar_inregistrare_strainatate: ['', Validators.required],
      cod_identificare_fiscal_ro: ['', Validators.required],
      tip_entitate: ['SRL', Validators.required],
      data_inregistrare_romania: ['', Validators.required],
      sucursala_in_romania: [false],

      adresa_sediu_romania: this.fb.group({
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
        parent_type: ['entitate_straina'],
        nume: ['', Validators.required],
        prenume: ['', Validators.required],
        cnp: ['0000000000000', Validators.required],
        tip_act_identitate: [TipActIdentitate.Pasaport, Validators.required],
        serie_act_identitate: ['', Validators.required],
        numar_act_identitate: ['', Validators.required],
        calitate: [CalitateReprezentant.Mandatar, Validators.required],
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
    const formData: EntitateStrainaRequest = this.entityForm.value;

    this.entityService.createEntitateStraina(formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.entityForm.reset();
        this.initForm();
        this.formSubmitted.emit();
      },
      error: (error: unknown) => {
        this.isLoading = false;
        console.error('Error creating Entitate Straina:', error);
      },
    });
  }

  onCancel(): void {
    this.formCancelled.emit();
  }
}
