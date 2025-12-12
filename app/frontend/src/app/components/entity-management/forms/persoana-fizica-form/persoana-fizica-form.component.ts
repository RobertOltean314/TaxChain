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
  TipPersoanaFizica,
  TipActIdentitate,
  CalitateReprezentant,
  TipDovada,
  StareFiscala,
  PersoanaFizicaRequest,
} from '../../../../features/entity_management/models/entitate_fiscala.models';

@Component({
  selector: 'app-persoana-fizica-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    CollapsibleComponent,
  ],
  templateUrl: './persoana-fizica-form.component.html',
  styleUrl: './persoana-fizica-form.component.css',
})
export class PersoanaFizicaFormComponent implements OnInit {
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  entityForm!: FormGroup;
  isLoading = false;

  // Enums for dropdowns
  TipPersoanaFizica = Object.values(TipPersoanaFizica);
  TipActIdentitate = Object.values(TipActIdentitate);
  CalitateReprezentant = Object.values(CalitateReprezentant);
  TipDovada = Object.values(TipDovada);
  StareFiscala = Object.values(StareFiscala);

  private fb = inject(FormBuilder);
  private entityService = inject(EntityManagementService);
  private authService = inject(MultiversxAuthService);

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.entityForm = this.fb.group({
      tip: [TipPersoanaFizica.PFA, Validators.required],
      cnp: [
        '',
        [
          Validators.required,
          Validators.minLength(13),
          Validators.maxLength(13),
        ],
      ],
      nume: ['', Validators.required],
      prenume: ['', Validators.required],
      serie_act_identitate: ['', Validators.required],
      numar_act_identitate: ['', Validators.required],
      data_nasterii: ['', Validators.required],
      cetatenie: ['Romana', Validators.required],
      dovada_drept_folosinta: [TipDovada.ContractDeProprietate],
      cod_caen: [''],
      data_inregistrarii: [''],
      euid: [''],
      nr_ordine_reg_comert: [''],
      platitor_tva: [false],
      stare_fiscala: [StareFiscala.Activ, Validators.required],
      inregistrat_in_spv: [false],

      // Adresa Domiciliu
      adresa_domiciliu: this.fb.group({
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

      // Reprezentant
      reprezentant: this.fb.group({
        parent_id: ['00000000-0000-0000-0000-000000000000'],
        parent_type: ['persoana_fizica'],
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

    // Get wallet address from auth service
    const walletAddress = this.authService.getAddress();
    if (!walletAddress) {
      console.error('No wallet address found. User must be authenticated.');
      return;
    }

    this.isLoading = true;
    const formData: PersoanaFizicaRequest = {
      ...this.entityForm.value,
      owner_wallet_address: walletAddress, // Add wallet address from authenticated user
      entity_wallet_address: undefined, // Optional: can be added later if entity needs separate wallet
    };

    this.entityService.createPersoanaFizica(formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.entityForm.reset();
        this.initForm();
        this.formSubmitted.emit();
      },
      error: (error: unknown) => {
        this.isLoading = false;
        console.error('Error creating Persoana Fizica:', error);
      },
    });
  }

  onCancel(): void {
    this.formCancelled.emit();
  }
}
