import { Test, TestingModule } from '@nestjs/testing';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

describe('VendorsController', () => {
  let controller: VendorsController;

  const mockVendorsResponse = {
    vendors: [],
    summary: {
      total_vendors: 0,
      high_quality_count: 0,
      medium_quality_count: 0,
      low_quality_count: 0,
      suspended_count: 0,
      fraud_review_count: 0,
      total_budget_at_risk: 0,
    },
    computed_at: '2026-01-01T00:00:00.000Z',
  };

  const mockVendorScore = {
    vendor_id: 'SIM-001',
    vendor_name: 'Test',
    campaign_id: 'SIM-CAMPAIGN',
    campaign_name: 'Simulator',
    geo_target: 'US',
    total_clicks: 1000,
    days_active: 30,
    experiment_phase: 'active',
    budget_allocation_pct: 0,
    signals: {
      ip_diversity: 0.9,
      geo_relevance: 0.85,
      device_fp_uniqueness: 0.88,
      click_timing_variance: 0.5,
      bot_candidate_rate: 0.99,
    },
    fraud_signals: {
      velocity_anomaly: 0.1,
      ip_concentration: 0.2,
      scanner_detection: 0.1,
      fp_clustering: 0.1,
      behavioral_regularity: 0.3,
    },
    tqs: 0.8,
    fraud_p: 0.2,
    effective_score: 0.64,
    quality_tier: 'medium' as const,
    fraud_status: 'clean' as const,
    budget_decision: 'hold' as const,
    budget_decision_label: 'Hold',
    budget_change_pct: 0,
    decision_reason: 'test',
    ab_test_day: null,
    ab_test_control_vendor: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorsController],
      providers: [
        {
          provide: VendorsService,
          useValue: {
            getVendorsResponse: jest.fn().mockReturnValue(mockVendorsResponse),
            scoreFromInput: jest.fn().mockReturnValue(mockVendorScore),
          },
        },
      ],
    }).compile();

    controller = module.get<VendorsController>(VendorsController);
  });

  it('GET vendors returns vendors, summary, computed_at', () => {
    const res = controller.getVendors();
    expect(res).toHaveProperty('vendors');
    expect(res).toHaveProperty('summary');
    expect(res).toHaveProperty('computed_at');
    expect(res.summary).toHaveProperty('total_vendors');
  });

  it('POST score returns VendorScore', () => {
    const body = {
      vendor_name: 'X',
      total_clicks: 1000,
      unique_ips: 900,
      in_geo_clicks: 850,
      unique_device_fps: 880,
      click_timing_cov: 1.5,
      bot_flagged_clicks: 10,
      max_clicks_per_60s: 40,
      max_single_ip_clicks: 20,
      device_fp_max_24h: 5,
      scanner_clicks: 50,
    };
    const res = controller.score(body);
    expect(res.vendor_id).toBe('SIM-001');
    expect(res).toHaveProperty('tqs');
    expect(res).toHaveProperty('effective_score');
  });
});
