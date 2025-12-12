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
  StareFiscala,
  PersoanaJuridicaRequest,
} from '../../../../features/entity_management/models/entitate_fiscala.models';

@Component({
  selector: 'app-persoana-juridica-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    CollapsibleComponent,
  ],
  templateUrl: './persoana-juridica-form.component.html',
  styleUrl: './persoana-juridica-form.component.css',
})
export class PersoanaJuridicaFormComponent implements OnInit {
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  entityForm!: FormGroup;
  isLoading = false;

  TipActIdentitate = Object.values(TipActIdentitate);
  CalitateReprezentant = Object.values(CalitateReprezentant);
  StareFiscala = Object.values(StareFiscala);

  private fb = inject(FormBuilder);
  private entityService = inject(EntityManagementService);

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.entityForm = this.fb.group({
      denumire: ['', Validators.required],
      cui: ['', Validators.required],
      nr_reg_comert: ['', Validators.required],
      forma_juridica: ['SRL', Validators.required],
      cod_caen: [''],
      capital_social: [0, [Validators.required, Validators.min(0)]],
      platitor_tva: [false],
      stare_fiscala: [StareFiscala.Activ, Validators.required],
      data_infiintarii: ['', Validators.required],

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
        parent_type: ['persoana_juridica'],
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
        calitate: [CalitateReprezentant.Administrator, Validators.required],
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
    const formData: PersoanaJuridicaRequest = this.entityForm.value;

    this.entityService.createPersoanaJuridica(formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.entityForm.reset();
        this.initForm();
        this.formSubmitted.emit();
      },
      error: (error: unknown) => {
        this.isLoading = false;
        console.error('Error creating Persoana Juridica:', error);
      },
    });
  }

  onCancel(): void {
    this.formCancelled.emit();
  }
}
