import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ClassItem, SectionItem } from '../core/models';
import { UiService } from '../core/ui.service';

type StudentCredential = {
  student_name: string;
  username: string;
  student_grade: number;
  section_id: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid">
      <article class="card">
        <h2>{{ ui.t('createTeacher') }}</h2>
        <div class="row">
          <input [(ngModel)]="teacherName" [placeholder]="ui.t('teacherName')" />
          <input [(ngModel)]="teacherEmail" [placeholder]="ui.t('teacherEmail')" />
        </div>
        <div class="row">
          <input [(ngModel)]="teacherPassword" [placeholder]="ui.t('teacherPassword')" type="password" />
          <button (click)="createTeacher()">{{ ui.t('createTeacher') }}</button>
        </div>
      </article>

      <article class="card">
        <h2>{{ ui.t('createClass') }}</h2>
        <div class="row">
          <input [(ngModel)]="className" [placeholder]="ui.t('className')" />
          <input [(ngModel)]="classGrade" type="number" min="1" max="12" />
        </div>
        <div class="row">
          <select [(ngModel)]="teacherId">
            <option *ngFor="let t of teachers" [value]="t.id">{{ t.name }}</option>
          </select>
          <button (click)="createClass()">{{ ui.t('createClass') }}</button>
        </div>
      </article>

      <article class="card">
        <h2>{{ ui.t('createSection') }}</h2>
        <div class="row">
          <select [(ngModel)]="sectionClassId">
            <option *ngFor="let c of classes" [value]="c.id">{{ c.name }}</option>
          </select>
          <input [(ngModel)]="sectionName" [placeholder]="ui.t('section')" />
        </div>
        <button class="secondary" (click)="createSection()">{{ ui.t('createSection') }}</button>
      </article>
    </section>

    <section class="card" style="margin-top: 0.9rem">
      <h2>{{ ui.t('addStudent') }}</h2>
      <div class="row triple">
        <input [(ngModel)]="studentName" [placeholder]="ui.t('studentName')" />
        <input [(ngModel)]="studentGrade" type="number" min="1" max="12" />
        <input [(ngModel)]="studentLanguage" [placeholder]="ui.t('languageCode')" />
      </div>
      <div class="row">
        <select [(ngModel)]="studentClassId" (ngModelChange)="onStudentClassChange()">
          <option *ngFor="let c of classes" [value]="c.id">{{ c.name }}</option>
        </select>
        <select [(ngModel)]="studentSectionId">
          <option *ngFor="let s of studentSections" [value]="s.id">{{ ui.t('section') }} {{ s.name }}</option>
        </select>
      </div>
      <button class="ghost" (click)="createStudent()">{{ ui.t('addStudentBtn') }}</button>
      <div class="small" style="margin-top: 0.55rem">{{ state }}</div>
    </section>

    <section class="card" style="margin-top: 0.9rem">
      <h2>{{ ui.t('studentCreds') }}</h2>
      <div class="list">
        <div *ngFor="let cred of studentCredentials">
          <strong>{{ cred.student_name }}</strong>
          <div class="small">{{ ui.t('grade') }} {{ cred.student_grade }}</div>
          <div class="small">{{ ui.t('username') }}: {{ cred.username }}</div>
          <div class="small">{{ ui.t('temporaryPassword') }}: student123</div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .grid {
        display: grid;
        gap: 0.8rem;
        grid-template-columns: repeat(3, 1fr);
      }

      .row {
        margin-top: 0.7rem;
        display: grid;
        gap: 0.55rem;
        grid-template-columns: 1fr 1fr;
      }

      .row.triple {
        grid-template-columns: 1fr 1fr 1fr;
      }

      h2 {
        font-size: 1.05rem;
      }

      @media (max-width: 1180px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 980px) {
        .row,
        .row.triple {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class AdminDashboardComponent implements OnInit {
  teachers: any[] = [];
  classes: ClassItem[] = [];
  studentCredentials: StudentCredential[] = [];

  teacherName = '';
  teacherEmail = '';
  teacherPassword = 'teacher123';

  className = '';
  classGrade = 4;
  teacherId = '';

  sectionClassId = '';
  sectionName = 'A';

  studentName = '';
  studentGrade = 4;
  studentLanguage = 'hi';
  studentClassId = '';
  studentSectionId = '';
  studentSections: SectionItem[] = [];

  private stateKey = 'ready';
  private stateMessage = '';

  constructor(private readonly api: ApiService, public readonly ui: UiService) {}

  get state(): string {
    return this.stateMessage || this.ui.t(this.stateKey);
  }

  async ngOnInit(): Promise<void> {
    await this.loadAdminData();
  }

  async loadAdminData(): Promise<void> {
    this.teachers = await this.api.get('/admin/teachers');
    this.classes = await this.api.get<ClassItem[]>('/teacher/classes');
    this.studentCredentials = await this.api.get<StudentCredential[]>('/admin/student-accounts');

    this.teacherId = this.teachers[0]?.id || '';
    this.sectionClassId = this.classes[0]?.id || '';
    this.studentClassId = this.classes[0]?.id || '';
    await this.onStudentClassChange();
  }

  async createTeacher(): Promise<void> {
    if (!this.teacherName || !this.teacherEmail || !this.teacherPassword) {
      this.stateKey = 'ready';
      this.stateMessage = 'Teacher name/email/password required.';
      return;
    }

    try {
      await this.api.post(
        '/auth/register',
        {
          name: this.teacherName,
          email: this.teacherEmail,
          password: this.teacherPassword,
          role: 'teacher'
        },
        true
      );
      this.stateKey = 'teacherCreated';
      this.stateMessage = `${this.ui.t('teacherCreated')} ${this.teacherEmail}`;
      this.teacherName = '';
      this.teacherEmail = '';
      this.teachers = await this.api.get('/admin/teachers');
      this.teacherId = this.teachers[0]?.id || '';
    } catch (error: any) {
      this.stateKey = 'ready';
      this.stateMessage = error?.message || 'Unable to create teacher.';
    }
  }

  async createClass(): Promise<void> {
    try {
      await this.api.post('/admin/classes', {
        name: this.className,
        grade: Number(this.classGrade),
        teacherId: this.teacherId
      });
      this.stateKey = 'classCreatedReload';
      this.stateMessage = '';
      this.classes = await this.api.get<ClassItem[]>('/teacher/classes');
      this.sectionClassId = this.classes[0]?.id || this.sectionClassId;
      this.studentClassId = this.classes[0]?.id || this.studentClassId;
      await this.onStudentClassChange();
    } catch (error: any) {
      this.stateKey = 'ready';
      this.stateMessage = error?.message || 'Unable to create class.';
    }
  }

  async createSection(): Promise<void> {
    try {
      await this.api.post(`/admin/classes/${this.sectionClassId}/sections`, {
        name: this.sectionName
      });
      this.stateKey = 'sectionCreated';
      this.stateMessage = '';
      await this.onStudentClassChange();
    } catch (error: any) {
      this.stateKey = 'ready';
      this.stateMessage = error?.message || 'Unable to create section.';
    }
  }

  async onStudentClassChange(): Promise<void> {
    if (!this.studentClassId) return;
    this.studentSections = await this.api.get<SectionItem[]>(`/teacher/classes/${this.studentClassId}/sections`);
    this.studentSectionId = this.studentSections[0]?.id || '';
  }

  async createStudent(): Promise<void> {
    try {
      const response: any = await this.api.post(`/admin/sections/${this.studentSectionId}/students`, {
        name: this.studentName,
        grade: Number(this.studentGrade),
        language: this.studentLanguage,
        classId: this.studentClassId
      });
      this.stateKey = 'studentAdded';
      this.stateMessage = response?.credentials?.username
        ? `${this.ui.t('studentAdded')} ${this.ui.t('username')}: ${response.credentials.username} | ${this.ui.t(
            'temporaryPassword'
          )}: ${response.credentials.temporaryPassword}`
        : this.ui.t('studentAdded');
      this.studentCredentials = await this.api.get<StudentCredential[]>('/admin/student-accounts');
    } catch (error: any) {
      this.stateKey = 'ready';
      this.stateMessage = error?.message || 'Unable to create student.';
    }
  }
}
