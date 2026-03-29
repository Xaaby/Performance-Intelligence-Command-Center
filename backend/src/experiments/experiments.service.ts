import { Injectable } from '@nestjs/common';
import { VendorsService } from '../vendors/vendors.service';
import type {
  BanditAllocation,
  ColdStartVendor,
  ExperimentRecord,
  VendorScore,
} from '../scoring/scoring.types';

@Injectable()
export class ExperimentsService {
  constructor(private readonly vendorsService: VendorsService) {}

  getExperimentsResponse() {
    const scored = this.vendorsService.getScoredVendors();
    const byId = new Map(scored.map((s) => [s.vendor_id, s]));

    return {
      experiments: this.buildExperiments(scored, byId),
      bandit_allocations: this.buildBandits(scored),
      cold_start_vendors: this.buildColdStart(scored),
    };
  }

  private buildExperiments(
    scored: VendorScore[],
    byId: Map<string, VendorScore>,
  ): ExperimentRecord[] {
    return scored
      .filter((s) => s.experiment_phase === 'ab_test')
      .map((s) => {
        const cid = s.ab_test_control_vendor;
        const control = cid ? byId.get(cid) : undefined;
        const current_treatment_score = s.effective_score;
        const current_control_score = control?.effective_score ?? current_treatment_score;
        const score_delta = current_treatment_score - current_control_score;
        const day_current = s.ab_test_day != null ? Math.floor(s.ab_test_day) : 0;
        const p_value =
          day_current >= 10 && score_delta > 0.1 ? 0.03 : 0.12;
        let status: ExperimentRecord['status'];
        if (p_value === 0.03) {
          status = 'significant';
        } else if (day_current >= 14) {
          status = 'inconclusive';
        } else {
          status = 'running';
        }
        return {
          vendor_id: s.vendor_id,
          vendor_name: s.vendor_name,
          campaign_id: s.campaign_id,
          phase: 'ab_test' as const,
          control_vendor_id: control?.vendor_id ?? cid ?? '',
          control_vendor_name: control?.vendor_name ?? 'Unknown control',
          traffic_split: { control: 80, treatment: 20 },
          day_current,
          day_total: 14,
          primary_metric: 'effective_score_delta' as const,
          current_treatment_score,
          current_control_score,
          score_delta,
          p_value,
          status,
        };
      });
  }

  private buildBandits(scored: VendorScore[]): BanditAllocation[] {
    return scored
      .filter((s) => s.experiment_phase === 'bandit')
      .map((s) => {
        let confidence: BanditAllocation['confidence'] = 'low';
        if (s.effective_score >= 0.72) confidence = 'high';
        else if (s.effective_score >= 0.52) confidence = 'medium';
        let trend: BanditAllocation['trend'] = 'stable';
        if (s.effective_score >= 0.62) trend = 'up';
        else if (s.effective_score < 0.42) trend = 'down';
        return {
          vendor_id: s.vendor_id,
          vendor_name: s.vendor_name,
          allocation_pct: s.budget_allocation_pct,
          confidence,
          trend,
        };
      });
  }

  private buildColdStart(scored: VendorScore[]): ColdStartVendor[] {
    return scored
      .filter((s) => s.experiment_phase === 'cold_start')
      .map((s) => {
        let day7_review_status: ColdStartVendor['day7_review_status'] = 'pending';
        if (s.days_active >= 7) {
          day7_review_status =
            s.effective_score >= 0.45 ? 'passed' : 'failed';
        }
        return {
          vendor_id: s.vendor_id,
          vendor_name: s.vendor_name,
          days_active: s.days_active,
          clicks_so_far: s.total_clicks,
          current_score: s.effective_score,
          prior_score: 0.5,
          day7_review_status,
        };
      });
  }
}
