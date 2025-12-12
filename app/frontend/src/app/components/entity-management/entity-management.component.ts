import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PersoanaFizicaService } from '../../features/entity_management/services/persoana-fizica.service';
import {
  PersoanaFizicaRequest,
  PersoanaFizicaResponse,
  TipPersoanaFizica,
  TipActIdentitate,
  CalitateReprezentant,
  TipDovada,
  StareFiscala,
} from '../../features/entity_management/models/entitate_fiscala.models';

@Component({
  selector: 'app-entity-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './entity-management.component.html',
  styleUrl: './entity-management.component.css',
})
export class EntityManagementComponent implements OnInit {
  entityForm!: FormGroup;
  isEditMode = false;
  currentEntityId: string | null = null;
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Enums for dropdowns
  TipPersoanaFizica = Object.values(TipPersoanaFizica);
  TipActIdentitate = Object.values(TipActIdentitate);
  CalitateReprezentant = Object.values(CalitateReprezentant);
  TipDovada = Object.values(TipDovada);
  StareFiscala = Object.values(StareFiscala);

  constructor(
    private fb: FormBuilder,
    private persoanaFizicaService: PersoanaFizicaService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.entityForm = this.fb.group({
      // Informatii principale
      tip: [TipPersoanaFizica.PFA, Validators.required],
      cnp: [
        '',
        [
          Validators.required,
          Validators.minLength(13),
          Validators.maxLength(13),
        ],
      ],
      nume: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(14),
        ],
      ],
      prenume: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(14),
        ],
      ],
      serie_act_identitate: ['', Validators.required],
      numar_act_identitate: ['', Validators.required],
      data_nasterii: ['', Validators.required],
      cetatenie: ['Romania', Validators.required],

      // Adresa domiciliu
      adresa_tara: ['Romania', Validators.required],
      adresa_judet: ['', Validators.required],
      adresa_localitate: ['', Validators.required],
      adresa_cod_postal: [''],
      adresa_strada: ['', Validators.required],
      adresa_numar: ['', Validators.required],
      adresa_bloc: [''],
      adresa_scara: [''],
      adresa_etaj: [''],
      adresa_apartament: [''],

      dovada_drept_folosinta: [null],

      // Reprezentant
      reprezentant_nume: ['', Validators.required],
      reprezentant_prenume: ['', Validators.required],
      reprezentant_cnp: [
        '',
        [
          Validators.required,
          Validators.minLength(13),
          Validators.maxLength(13),
        ],
      ],
      reprezentant_tip_act: [
        TipActIdentitate.CarteIdentitate,
        Validators.required,
      ],
      reprezentant_serie_act: ['', Validators.required],
      reprezentant_numar_act: ['', Validators.required],
      reprezentant_calitate: [
        CalitateReprezentant.Proprietar,
        Validators.required,
      ],
      reprezentant_telefon: ['', Validators.required],
      reprezentant_email: ['', [Validators.required, Validators.email]],
      reprezentant_data_nasterii: ['', Validators.required],

      // Informatii fiscale
      cod_caen: [''],
      data_inregistrarii: [''],
      euid: [''],
      nr_ordine_reg_comert: [''],
      platitor_tva: [false],
      stare_fiscala: [StareFiscala.Activ, Validators.required],
      inregistrat_in_spv: [false],
    });
  }

  onSubmit(): void {
    if (this.entityForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      this.markFormGroupTouched(this.entityForm);
      return;
    }

    const formValue = this.entityForm.value;

    const requestData: PersoanaFizicaRequest = {
      tip: formValue.tip,
      cnp: formValue.cnp,
      nume: formValue.nume,
      prenume: formValue.prenume,
      serie_act_identitate: formValue.serie_act_identitate,
      numar_act_identitate: formValue.numar_act_identitate,
      data_nasterii: formValue.data_nasterii,
      cetatenie: formValue.cetatenie,
      adresa_domiciliu: {
        tara: formValue.adresa_tara,
        judet: formValue.adresa_judet,
        localitate: formValue.adresa_localitate,
        cod_postal: formValue.adresa_cod_postal || undefined,
        strada: formValue.adresa_strada,
        numar: formValue.adresa_numar,
        bloc: formValue.adresa_bloc || undefined,
        scara: formValue.adresa_scara || undefined,
        etaj: formValue.adresa_etaj || undefined,
        apartament: formValue.adresa_apartament || undefined,
      },
      dovada_drept_folosinta: formValue.dovada_drept_folosinta || undefined,
      reprezentant: {
        parent_id:
          this.currentEntityId || '00000000-0000-0000-0000-000000000000',
        parent_type: 'persoana_fizica',
        nume: formValue.reprezentant_nume,
        prenume: formValue.reprezentant_prenume,
        cnp: formValue.reprezentant_cnp,
        tip_act_identitate: formValue.reprezentant_tip_act,
        serie_act_identitate: formValue.reprezentant_serie_act,
        numar_act_identitate: formValue.reprezentant_numar_act,
        calitate: formValue.reprezentant_calitate,
        telefon: formValue.reprezentant_telefon,
        email: formValue.reprezentant_email,
        data_nasterii: formValue.reprezentant_data_nasterii,
        adresa_domiciliu: '00000000-0000-0000-0000-000000000000',
      },
      cod_caen: formValue.cod_caen || undefined,
      data_inregistrarii: formValue.data_inregistrarii || undefined,
      euid: formValue.euid || undefined,
      nr_ordine_reg_comert: formValue.nr_ordine_reg_comert || undefined,
      platitor_tva: formValue.platitor_tva,
      stare_fiscala: formValue.stare_fiscala,
      inregistrat_in_spv: formValue.inregistrat_in_spv,
    };

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (this.isEditMode && this.currentEntityId) {
      this.updateEntity(this.currentEntityId, requestData);
    } else {
      this.createEntity(requestData);
    }
  }

  createEntity(data: PersoanaFizicaRequest): void {
    this.persoanaFizicaService.create(data).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Entity created successfully!';
        this.currentEntityId = response.uuid;
        this.isEditMode = true;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = `Failed to create entity: ${
          error.error?.details || error.message
        }`;
        console.error('Create error:', error);
      },
    });
  }

  updateEntity(uuid: string, data: PersoanaFizicaRequest): void {
    this.persoanaFizicaService.update(uuid, data).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Entity updated successfully!';
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = `Failed to update entity: ${
          error.error?.details || error.message
        }`;
        console.error('Update error:', error);
      },
    });
  }

  loadEntity(uuid: string): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.persoanaFizicaService.getById(uuid).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isEditMode = true;
        this.currentEntityId = response.uuid;
        this.populateForm(response);
        this.successMessage = 'Entity loaded successfully!';
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = `Failed to load entity: ${
          error.error?.details || error.message
        }`;
        console.error('Load error:', error);
      },
    });
  }

  populateForm(entity: PersoanaFizicaResponse): void {
    this.entityForm.patchValue({
      tip: entity.tip,
      nume: entity.nume,
      prenume: entity.prenume,
      serie_act_identitate: entity.serie_act_identitate,
      numar_act_identitate: entity.numar_act_identitate,
      data_nasterii: entity.data_nasterii,
      cetatenie: entity.cetatenie,
      adresa_tara: entity.adresa_domiciliu.tara,
      adresa_judet: entity.adresa_domiciliu.judet,
      adresa_localitate: entity.adresa_domiciliu.localitate,
      adresa_cod_postal: entity.adresa_domiciliu.cod_postal,
      adresa_strada: entity.adresa_domiciliu.strada,
      adresa_numar: entity.adresa_domiciliu.numar,
      adresa_bloc: entity.adresa_domiciliu.bloc,
      adresa_scara: entity.adresa_domiciliu.scara,
      adresa_etaj: entity.adresa_domiciliu.etaj,
      adresa_apartament: entity.adresa_domiciliu.apartament,
      reprezentant_nume: entity.reprezentant.nume,
      reprezentant_prenume: entity.reprezentant.prenume,
      reprezentant_telefon: entity.reprezentant.telefon,
      reprezentant_email: entity.reprezentant.email,
      reprezentant_calitate: entity.reprezentant.calitate,
      cod_caen: entity.cod_caen,
      platitor_tva: entity.platitor_tva,
      stare_fiscala: entity.stare_fiscala,
      inregistrat_in_spv: entity.inregistrat_in_spv,
    });
  }

  deleteEntity(): void {
    if (!this.currentEntityId) {
      this.errorMessage = 'No entity selected for deletion';
      return;
    }

    if (!confirm('Are you sure you want to delete this entity?')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.persoanaFizicaService.delete(this.currentEntityId).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Entity deleted successfully!';
        this.resetForm();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = `Failed to delete entity: ${
          error.error?.details || error.message
        }`;
        console.error('Delete error:', error);
      },
    });
  }

  resetForm(): void {
    this.entityForm.reset({
      tip: TipPersoanaFizica.PFA,
      cetatenie: 'Romania',
      adresa_tara: 'Romania',
      reprezentant_tip_act: TipActIdentitate.CarteIdentitate,
      reprezentant_calitate: CalitateReprezentant.Proprietar,
      platitor_tva: false,
      stare_fiscala: StareFiscala.Activ,
      inregistrat_in_spv: false,
    });
    this.isEditMode = false;
    this.currentEntityId = null;
    this.successMessage = null;
    this.errorMessage = null;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  onLoadById(): void {
    const uuid = prompt('Enter the UUID of the entity to load:');
    if (uuid) {
      this.loadEntity(uuid);
    }
  }
}
