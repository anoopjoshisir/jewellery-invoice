import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc
} from '@angular/fire/firestore';
import {
  SchemePlan,
  SchemeEnrollment,
  SchemeStatus,
  InstallmentStatus,
  Installment,
  SchemeSummary,
  SchemeType,
  generateEnrollmentNumber,
  calculateMaturityDate,
  generateInstallmentSchedule,
  calculateBonusAmount,
  getNextDueDate,
  getOverdueCount
} from '../models/scheme.model';

@Injectable({
  providedIn: 'root'
})
export class SchemeService {
  private plansCollection = 'schemePlans';
  private enrollmentsCollection = 'schemeEnrollments';

  constructor(private firestore: Firestore) {}

  // ==================== Scheme Plans ====================

  /**
   * Create a new scheme plan
   */
  async createPlan(plan: Omit<SchemePlan, 'id'>): Promise<string> {
    try {
      const planCollection = collection(this.firestore, this.plansCollection);
      const newDocRef = doc(planCollection);

      const planData: SchemePlan = {
        ...plan,
        id: newDocRef.id,
        createdAt: new Date().toISOString()
      };

      await setDoc(newDocRef, planData);
      return newDocRef.id;
    } catch (error) {
      console.error('Error creating scheme plan:', error);
      throw error;
    }
  }

  /**
   * Update scheme plan
   */
  async updatePlan(id: string, updates: Partial<SchemePlan>): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.plansCollection, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating scheme plan:', error);
      throw error;
    }
  }

  /**
   * Get all active plans
   */
  async getActivePlans(tenantId: string): Promise<SchemePlan[]> {
    try {
      const planCollection = collection(this.firestore, this.plansCollection);
      const q = query(
        planCollection,
        where('tenantId', '==', tenantId),
        where('isActive', '==', true),
        orderBy('planName')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as SchemePlan);
    } catch (error) {
      console.error('Error getting active plans:', error);
      throw error;
    }
  }

  /**
   * Get all plans
   */
  async getAllPlans(tenantId: string): Promise<SchemePlan[]> {
    try {
      const planCollection = collection(this.firestore, this.plansCollection);
      const q = query(
        planCollection,
        where('tenantId', '==', tenantId),
        orderBy('planName')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as SchemePlan);
    } catch (error) {
      console.error('Error getting all plans:', error);
      throw error;
    }
  }

  /**
   * Get plan by ID
   */
  async getPlan(id: string): Promise<SchemePlan | null> {
    try {
      const docRef = doc(this.firestore, this.plansCollection, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as SchemePlan;
    } catch (error) {
      console.error('Error getting plan:', error);
      throw error;
    }
  }

  // ==================== Scheme Enrollments ====================

  /**
   * Enroll customer in a scheme
   */
  async enrollCustomer(
    enrollment: Omit<SchemeEnrollment, 'id' | 'enrollmentNumber' | 'installments'>
  ): Promise<string> {
    try {
      const enrollmentCollection = collection(this.firestore, this.enrollmentsCollection);
      const newDocRef = doc(enrollmentCollection);

      // Generate enrollment number
      const year = new Date().getFullYear();
      const sequence = await this.getNextEnrollmentSequence(enrollment.tenantId, year);
      const enrollmentNumber = generateEnrollmentNumber(year, sequence);

      // Generate installment schedule
      const installments = generateInstallmentSchedule(
        enrollment.startDate,
        enrollment.installmentAmount,
        enrollment.totalInstallments
      );

      // Calculate maturity date
      const plan = await this.getPlan(enrollment.planId);
      const maturityDate = calculateMaturityDate(
        enrollment.startDate,
        plan?.durationMonths || enrollment.totalInstallments
      );

      // Calculate bonus
      const expectedTotal = enrollment.installmentAmount * enrollment.totalInstallments;
      const bonusAmount = plan ?
        calculateBonusAmount(
          expectedTotal,
          plan.bonusMonths,
          enrollment.installmentAmount,
          plan.bonusPercent
        ) : 0;

      const enrollmentData: SchemeEnrollment = {
        ...enrollment,
        id: newDocRef.id,
        enrollmentNumber,
        maturityDate,
        installments,
        paidInstallments: 0,
        totalPaid: 0,
        pendingAmount: expectedTotal,
        nextDueDate: installments[0]?.dueDate || '',
        overdueInstallments: 0,
        bonusAmount,
        totalMaturityValue: expectedTotal + bonusAmount,
        status: SchemeStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(newDocRef, enrollmentData);
      return newDocRef.id;
    } catch (error) {
      console.error('Error enrolling customer:', error);
      throw error;
    }
  }

  /**
   * Update enrollment
   */
  async updateEnrollment(id: string, updates: Partial<SchemeEnrollment>): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.enrollmentsCollection, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating enrollment:', error);
      throw error;
    }
  }

  /**
   * Pay installment
   */
  async payInstallment(
    enrollmentId: string,
    installmentNumber: number,
    amount: number,
    paymentMode: string,
    receiptNumber: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const enrollment = await this.getEnrollment(enrollmentId);
      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      // Find and update installment
      const installments = enrollment.installments.map(inst => {
        if (inst.installmentNumber === installmentNumber) {
          return {
            ...inst,
            status: InstallmentStatus.PAID,
            paidAmount: amount,
            paidDate: new Date().toISOString().split('T')[0],
            paymentMode,
            receiptNumber
          };
        }
        return inst;
      });

      // Update progress
      const paidInstallments = installments.filter(i => i.status === InstallmentStatus.PAID).length;
      const totalPaid = installments
        .filter(i => i.status === InstallmentStatus.PAID)
        .reduce((sum, i) => sum + (i.paidAmount || i.amount), 0);
      const pendingAmount = (enrollment.installmentAmount * enrollment.totalInstallments) - totalPaid;
      const nextDueDate = getNextDueDate(installments);
      const overdueInstallments = getOverdueCount(installments);

      // Check for maturity
      let status = enrollment.status;
      if (paidInstallments >= enrollment.totalInstallments) {
        status = SchemeStatus.MATURED;
      }

      await this.updateEnrollment(enrollmentId, {
        installments,
        paidInstallments,
        totalPaid,
        pendingAmount,
        nextDueDate,
        overdueInstallments,
        status,
        updatedBy: userId,
        updatedByName: userName
      });
    } catch (error) {
      console.error('Error paying installment:', error);
      throw error;
    }
  }

  /**
   * Redeem scheme
   */
  async redeemScheme(
    enrollmentId: string,
    redeemedAmount: number,
    invoiceId: string | undefined,
    invoiceNumber: string | undefined,
    cashRefund: number,
    remarks: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      await this.updateEnrollment(enrollmentId, {
        status: SchemeStatus.REDEEMED,
        redemption: {
          redeemedDate: new Date().toISOString().split('T')[0],
          redeemedAmount,
          invoiceId,
          invoiceNumber,
          cashRefund,
          remarks
        },
        updatedBy: userId,
        updatedByName: userName
      });
    } catch (error) {
      console.error('Error redeeming scheme:', error);
      throw error;
    }
  }

  /**
   * Close scheme (early termination)
   */
  async closeScheme(
    enrollmentId: string,
    reason: string,
    refundAmount: number,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      await this.updateEnrollment(enrollmentId, {
        status: SchemeStatus.CLOSED,
        notes: `Closed: ${reason}. Refund: ₹${refundAmount}`,
        updatedBy: userId,
        updatedByName: userName
      });
    } catch (error) {
      console.error('Error closing scheme:', error);
      throw error;
    }
  }

  /**
   * Get enrollment by ID
   */
  async getEnrollment(id: string): Promise<SchemeEnrollment | null> {
    try {
      const docRef = doc(this.firestore, this.enrollmentsCollection, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as SchemeEnrollment;
    } catch (error) {
      console.error('Error getting enrollment:', error);
      throw error;
    }
  }

  /**
   * Get all enrollments
   */
  async getAllEnrollments(tenantId: string): Promise<SchemeEnrollment[]> {
    try {
      const enrollmentCollection = collection(this.firestore, this.enrollmentsCollection);
      const q = query(
        enrollmentCollection,
        where('tenantId', '==', tenantId),
        orderBy('enrollmentDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as SchemeEnrollment);
    } catch (error) {
      console.error('Error getting all enrollments:', error);
      throw error;
    }
  }

  /**
   * Get active enrollments
   */
  async getActiveEnrollments(tenantId: string): Promise<SchemeEnrollment[]> {
    try {
      const enrollmentCollection = collection(this.firestore, this.enrollmentsCollection);
      const q = query(
        enrollmentCollection,
        where('tenantId', '==', tenantId),
        where('status', '==', SchemeStatus.ACTIVE),
        orderBy('nextDueDate')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as SchemeEnrollment);
    } catch (error) {
      console.error('Error getting active enrollments:', error);
      throw error;
    }
  }

  /**
   * Get customer enrollments
   */
  async getCustomerEnrollments(
    tenantId: string,
    customerId: string
  ): Promise<SchemeEnrollment[]> {
    try {
      const enrollmentCollection = collection(this.firestore, this.enrollmentsCollection);
      const q = query(
        enrollmentCollection,
        where('tenantId', '==', tenantId),
        where('customerId', '==', customerId),
        orderBy('enrollmentDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as SchemeEnrollment);
    } catch (error) {
      console.error('Error getting customer enrollments:', error);
      throw error;
    }
  }

  /**
   * Get enrollments with overdue payments
   */
  async getOverdueEnrollments(tenantId: string): Promise<SchemeEnrollment[]> {
    const enrollments = await this.getActiveEnrollments(tenantId);
    return enrollments.filter(e => e.overdueInstallments > 0);
  }

  /**
   * Get enrollments maturing soon (next 30 days)
   */
  async getUpcomingMaturities(tenantId: string, days: number = 30): Promise<SchemeEnrollment[]> {
    const enrollments = await this.getActiveEnrollments(tenantId);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    return enrollments.filter(
      e => e.maturityDate >= today && e.maturityDate <= futureDateStr
    );
  }

  /**
   * Get scheme summary
   */
  async getSchemeSummary(tenantId: string): Promise<SchemeSummary> {
    try {
      const enrollments = await this.getAllEnrollments(tenantId);

      const summary: SchemeSummary = {
        totalEnrollments: enrollments.length,
        activeEnrollments: 0,
        maturedEnrollments: 0,
        redeemedEnrollments: 0,
        totalCollected: 0,
        totalMaturityValue: 0,
        upcomingMaturities: 0,
        overduePayments: 0,
        monthlyCollection: 0,
        planWiseBreakdown: {}
      };

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const futureDate = thirtyDaysLater.toISOString().split('T')[0];

      const currentMonth = new Date().toISOString().substring(0, 7);

      enrollments.forEach(enrollment => {
        // Status counts
        switch (enrollment.status) {
          case SchemeStatus.ACTIVE:
            summary.activeEnrollments++;
            break;
          case SchemeStatus.MATURED:
            summary.maturedEnrollments++;
            break;
          case SchemeStatus.REDEEMED:
            summary.redeemedEnrollments++;
            break;
        }

        // Financial totals
        summary.totalCollected += enrollment.totalPaid;
        if (enrollment.status === SchemeStatus.ACTIVE) {
          summary.totalMaturityValue += enrollment.totalMaturityValue;
        }

        // Overdue count
        summary.overduePayments += enrollment.overdueInstallments;

        // Upcoming maturities
        if (enrollment.status === SchemeStatus.ACTIVE &&
            enrollment.maturityDate >= today &&
            enrollment.maturityDate <= futureDate) {
          summary.upcomingMaturities++;
        }

        // Monthly collection expected
        enrollment.installments.forEach(inst => {
          if (inst.status === InstallmentStatus.PENDING &&
              inst.dueDate.startsWith(currentMonth)) {
            summary.monthlyCollection += inst.amount;
          }
        });

        // Plan-wise breakdown
        const planId = enrollment.planId;
        if (!summary.planWiseBreakdown[planId]) {
          summary.planWiseBreakdown[planId] = {
            count: 0,
            collected: 0,
            maturityValue: 0
          };
        }
        summary.planWiseBreakdown[planId].count++;
        summary.planWiseBreakdown[planId].collected += enrollment.totalPaid;
        if (enrollment.status === SchemeStatus.ACTIVE) {
          summary.planWiseBreakdown[planId].maturityValue += enrollment.totalMaturityValue;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error getting scheme summary:', error);
      throw error;
    }
  }

  /**
   * Search enrollments
   */
  async searchEnrollments(tenantId: string, searchTerm: string): Promise<SchemeEnrollment[]> {
    try {
      const enrollments = await this.getAllEnrollments(tenantId);
      const term = searchTerm.toLowerCase();

      return enrollments.filter(
        e =>
          e.enrollmentNumber.toLowerCase().includes(term) ||
          e.customerName.toLowerCase().includes(term) ||
          e.customerMobile.includes(term) ||
          e.planName.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching enrollments:', error);
      throw error;
    }
  }

  /**
   * Update overdue statuses (run periodically)
   */
  async updateOverdueStatuses(tenantId: string): Promise<number> {
    try {
      const enrollments = await this.getActiveEnrollments(tenantId);
      const today = new Date().toISOString().split('T')[0];
      let updatedCount = 0;

      for (const enrollment of enrollments) {
        let hasUpdates = false;
        const installments = enrollment.installments.map(inst => {
          if (inst.status === InstallmentStatus.PENDING && inst.dueDate < today) {
            hasUpdates = true;
            return { ...inst, status: InstallmentStatus.OVERDUE };
          }
          return inst;
        });

        if (hasUpdates) {
          const overdueInstallments = installments.filter(
            i => i.status === InstallmentStatus.OVERDUE
          ).length;

          await this.updateEnrollment(enrollment.id!, {
            installments,
            overdueInstallments
          });
          updatedCount++;
        }
      }

      return updatedCount;
    } catch (error) {
      console.error('Error updating overdue statuses:', error);
      throw error;
    }
  }

  /**
   * Get next enrollment sequence
   */
  private async getNextEnrollmentSequence(tenantId: string, year: number): Promise<number> {
    try {
      const enrollmentCollection = collection(this.firestore, this.enrollmentsCollection);
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const q = query(
        enrollmentCollection,
        where('tenantId', '==', tenantId),
        where('enrollmentDate', '>=', yearStart),
        where('enrollmentDate', '<=', yearEnd),
        orderBy('enrollmentDate', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return 1;
      }

      const lastEnrollment = querySnapshot.docs[0].data() as SchemeEnrollment;
      const match = lastEnrollment.enrollmentNumber.match(/SCH-\d{4}-(\d{4})/);

      if (match) {
        return parseInt(match[1]) + 1;
      }

      return 1;
    } catch (error) {
      console.error('Error getting next sequence:', error);
      return 1;
    }
  }
}
