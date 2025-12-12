import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardContentComponent,
} from '../../shared/ui/card/card.component';
import { PersoanaFizicaFormComponent } from './forms/persoana-fizica-form/persoana-fizica-form.component';
import { PersoanaJuridicaFormComponent } from './forms/persoana-juridica-form/persoana-juridica-form.component';
import { OngFormComponent } from './forms/ong-form/ong-form.component';
import { InstitutiePublicaFormComponent } from './forms/institutie-publica-form/institutie-publica-form.component';
import { EntitateStrainaFormComponent } from './forms/entitate-straina-form/entitate-straina-form.component';
import { EntityType } from '../../features/entity_management/models/entitate_fiscala.models';

interface EntityTypeOption {
  value: EntityType | null;
  label: string;
  description: string;
}

@Component({
  selector: 'app-entity-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
    PersoanaFizicaFormComponent,
    PersoanaJuridicaFormComponent,
    OngFormComponent,
    InstitutiePublicaFormComponent,
    EntitateStrainaFormComponent,
  ],
  templateUrl: './entity-management.component.html',
  styleUrl: './entity-management.component.css',
})
export class EntityManagementComponent {
  selectedEntityType: EntityType | null = null;
  successMessage: string | null = null;

  entityTypes: EntityTypeOption[] = [
    {
      value: null,
      label: 'Selectează Tipul de Entitate',
      description: 'Alege tipul de entitate pe care dorești să o înregistrezi',
    },
    {
      value: EntityType.PersoanaFizica,
      label: 'Persoană Fizică',
      description: 'PFA, Întreprindere Individuală, Întreprindere Familială',
    },
    {
      value: EntityType.PersoanaJuridica,
      label: 'Persoană Juridică',
      description: 'SRL, SA, și alte forme juridice',
    },
    {
      value: EntityType.ONG,
      label: 'ONG',
      description: 'Asociații și Fundații',
    },
    {
      value: EntityType.InstitutiePublica,
      label: 'Instituție Publică',
      description: 'Primării, Consilii Județene, Ministere',
    },
    {
      value: EntityType.EntitateStraina,
      label: 'Entitate Străină',
      description: 'Companii străine cu activitate în România',
    },
  ];

  EntityType = EntityType;

  getSelectedEntityDescription(): string {
    return (
      this.entityTypes.find((et) => et.value === this.selectedEntityType)
        ?.description || ''
    );
  }

  onEntityTypeChange(value: string): void {
    this.selectedEntityType = value ? (value as EntityType) : null;
    this.successMessage = null;
  }

  onFormSubmitted(): void {
    const entityTypeLabel =
      this.entityTypes.find((et) => et.value === this.selectedEntityType)
        ?.label || 'Entitate';
    this.successMessage = `${entityTypeLabel} a fost salvată cu succes!`;

    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
  }

  onFormCancelled(): void {
    this.selectedEntityType = null;
    this.successMessage = null;
  }
}
