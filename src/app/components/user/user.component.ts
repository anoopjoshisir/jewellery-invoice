import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { CompanyService } from '../../core/services/company.service';
import { Company } from '../../core/models/company.model';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../main-layout/main-layout.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-user',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MainLayoutComponent],
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
    users: User[] = [];
    companies: Company[] = [];
    form: FormGroup;
    selectedUid: string | null = null;

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private auth: AuthService,
        private companyService: CompanyService
    ) {
        this.form = this.fb.group({
            name: [''],
            email: ['', [Validators.required, Validators.email]],
            displayName: [''],
            password:[''],
            companies: [[]],
            isAdmin: [false]
        });
    }

    async ngOnInit() {
        this.users = await this.userService.getAll();
        this.companies = await this.companyService.getAll();
    }

    async save() {
        if (!this.form.valid) return;
        const formValue = this.form.value;
        let user: User = {
            uid: this.selectedUid || '', // Will be set for update, otherwise blank for add (Firebase Auth generates real uid for new users)
            name: formValue.name,
            email: formValue.email,
            displayName: formValue.displayName,
            companies: formValue.companies,
            isAdmin: formValue.isAdmin
        };
        if (this.selectedUid) {
            await this.userService.setUser(user); // update existing user
        } else {
            // For new users, you might want to create an Auth user as well (not just Firestore)
            // Here, we just add to Firestore for demonstration
            await this.auth.register(formValue.email,formValue.password,formValue.name);
        }
        this.form.reset({ companies: [], isAdmin: false });
        this.selectedUid = null;
        this.users = await this.userService.getAll();
    }

    edit(u: User) {
        this.form.patchValue({
            name: u.name,
            email: u.email,
            displayName: u.displayName,
            companies: u.companies || [],
            isAdmin: u.isAdmin || false
        });        
        this.selectedUid = u.uid;
    }

    async remove(uid: string) {
        if (!uid) return;
        await this.userService.delete(uid);
        this.users = await this.userService.getAll();
        if (this.selectedUid === uid) {
            this.form.reset({ companies: [], isAdmin: false });
            this.selectedUid = null;
        }
    }
    // Add this helper method to your component (after class properties)
    isLastCompany(cid: string, companies: string[]): boolean {
        return companies?.[companies.length - 1] === cid;
    }
    getCompanyName(cid: string): string {
        const company = this.companies.find(c => c.id === cid);
        return company ? company.name : cid;
    }
}