"""
Guardrail compliance checker for the predictive_prescriptive skill.
Validates recommendations against DIM_GUARDRAILS governance rules.
"""


# The 8 active guardrails for Brightway Retail Demand Sensing
GUARDRAILS = {
    'GR-001': {
        'name': 'Gross Margin Floor',
        'metric': 'gross_margin_pct',
        'operator': '>=',
        'threshold': 18.0,
        'severity': 'HIGH',
        'breach_action': 'BLOCK',
        'scope': 'All Departments'
    },
    'GR-002': {
        'name': 'Max Promotional Discount',
        'metric': 'promo_discount_pct',
        'operator': '<=',
        'threshold': 40.0,
        'severity': 'HIGH',
        'breach_action': 'BLOCK',
        'scope': 'All Departments'
    },
    'GR-003': {
        'name': 'Fresh Stockout Threshold',
        'metric': 'days_of_supply',
        'operator': '>=',
        'threshold': 1.5,
        'severity': 'CRITICAL',
        'breach_action': 'ALERT',
        'scope': 'Fresh & Grocery'
    },
    'GR-004': {
        'name': 'Electronics Overstock Cap',
        'metric': 'days_of_supply',
        'operator': '<=',
        'threshold': 45.0,
        'severity': 'MEDIUM',
        'breach_action': 'WARN',
        'scope': 'Consumer Electronics'
    },
    'GR-005': {
        'name': 'Auto-Reorder Spend Limit',
        'metric': 'po_value_usd',
        'operator': '<=',
        'threshold': 250000.0,
        'severity': 'HIGH',
        'breach_action': 'BLOCK',
        'scope': 'All Departments'
    },
    'GR-006': {
        'name': 'Weekly Price Increase Cap',
        'metric': 'price_change_pct',
        'operator': '<=',
        'threshold': 10.0,
        'severity': 'MEDIUM',
        'breach_action': 'WARN',
        'scope': 'All Departments'
    },
    'GR-007': {
        'name': 'Seasonal Markdown Window',
        'metric': 'weeks_to_season_end',
        'operator': '<=',
        'threshold': 4.0,
        'severity': 'MEDIUM',
        'breach_action': 'WARN',
        'scope': 'Seasonal & Home'
    },
    'GR-008': {
        'name': 'AI Confidence Floor',
        'metric': 'confidence_score',
        'operator': '>=',
        'threshold': 0.60,
        'severity': 'HIGH',
        'breach_action': 'SUPPRESS',
        'scope': 'All Recommendations'
    }
}


def check_single_guardrail(guardrail_id: str, actual_value: float) -> dict:
    """
    Check a single guardrail against an actual value.

    Args:
        guardrail_id: The guardrail ID (e.g., 'GR-001')
        actual_value: The actual metric value to check

    Returns:
        Dict with compliance status and margin details
    """
    if guardrail_id not in GUARDRAILS:
        return {'error': f'Unknown guardrail: {guardrail_id}'}

    gr = GUARDRAILS[guardrail_id]
    threshold = gr['threshold']
    operator = gr['operator']

    # Evaluate compliance
    if operator == '>=':
        compliant = actual_value >= threshold
        margin = actual_value - threshold
        approaching = actual_value < threshold * 1.1 and compliant
    elif operator == '<=':
        compliant = actual_value <= threshold
        margin = threshold - actual_value
        approaching = actual_value > threshold * 0.9 and compliant
    else:
        compliant = actual_value == threshold
        margin = 0
        approaching = False

    if not compliant:
        status = 'BLOCKED'
    elif approaching:
        status = 'APPROACHING'
    else:
        status = 'CLEAR'

    return {
        'guardrail_id': guardrail_id,
        'guardrail_name': gr['name'],
        'metric': gr['metric'],
        'threshold': threshold,
        'operator': operator,
        'actual_value': round(actual_value, 2),
        'compliant': compliant,
        'status': status,
        'margin_to_threshold': round(margin, 2),
        'severity': gr['severity'],
        'breach_action': gr['breach_action'] if not compliant else None
    }


def check_recommendation(recommendation: dict) -> dict:
    """
    Validate a recommendation against all applicable guardrails.

    Args:
        recommendation: Dict with keys that may include:
            - confidence_score: float (0-1)
            - projected_margin_pct: float
            - discount_pct: float
            - days_of_supply: float
            - po_value_usd: float
            - price_change_pct: float
            - weeks_to_season_end: float
            - department: str

    Returns:
        Dict with per-guardrail results and overall compliance verdict
    """
    results = []
    department = recommendation.get('department', 'All')

    # Check each guardrail that applies to this recommendation
    checks = [
        ('GR-001', recommendation.get('projected_margin_pct')),
        ('GR-002', recommendation.get('discount_pct')),
        ('GR-003', recommendation.get('days_of_supply') if 'Fresh' in department else None),
        ('GR-004', recommendation.get('days_of_supply') if 'Electronics' in department else None),
        ('GR-005', recommendation.get('po_value_usd')),
        ('GR-006', recommendation.get('price_change_pct')),
        ('GR-007', recommendation.get('weeks_to_season_end') if 'Seasonal' in department else None),
        ('GR-008', recommendation.get('confidence_score')),
    ]

    for gr_id, value in checks:
        if value is not None:
            result = check_single_guardrail(gr_id, value)
            results.append(result)

    # Overall verdict
    blocked = [r for r in results if r.get('status') == 'BLOCKED']
    approaching = [r for r in results if r.get('status') == 'APPROACHING']

    if blocked:
        overall_status = 'BLOCKED'
        requires_approval = True
    elif approaching:
        overall_status = 'APPROACHING'
        requires_approval = True
    else:
        overall_status = 'CLEAR'
        requires_approval = False

    return {
        'guardrail_checks': results,
        'total_checked': len(results),
        'blocked_count': len(blocked),
        'approaching_count': len(approaching),
        'overall_status': overall_status,
        'requires_approval': requires_approval,
        'blocked_guardrails': [r['guardrail_id'] for r in blocked],
        'approaching_guardrails': [r['guardrail_id'] for r in approaching],
        'recommendation_actionable': overall_status != 'BLOCKED'
    }


def prioritize_recommendations(recommendations: list) -> list:
    """
    Prioritize and sort recommendations by urgency and impact.

    Args:
        recommendations: List of dicts with keys:
            - action: str
            - confidence_score: float
            - revenue_impact_usd: float
            - urgency: str (IMMEDIATE, THIS_WEEK, NEXT_CYCLE)
            - guardrail_status: str (CLEAR, APPROACHING, BLOCKED)

    Returns:
        Sorted list with priority rankings
    """
    URGENCY_WEIGHT = {'IMMEDIATE': 3, 'THIS_WEEK': 2, 'NEXT_CYCLE': 1}
    STATUS_WEIGHT = {'CLEAR': 1.0, 'APPROACHING': 0.7, 'BLOCKED': 0.0}

    scored = []
    for rec in recommendations:
        urgency_score = URGENCY_WEIGHT.get(rec.get('urgency', 'NEXT_CYCLE'), 1)
        status_score = STATUS_WEIGHT.get(rec.get('guardrail_status', 'CLEAR'), 1.0)
        confidence = float(rec.get('confidence_score', 0.5))
        impact = abs(float(rec.get('revenue_impact_usd', 0)))

        # Composite priority score
        # Normalize impact to 0-3 range (cap at $300K)
        impact_normalized = min(impact / 100000, 3.0)
        priority_score = (urgency_score * 0.3 + confidence * 0.3 +
                         impact_normalized * 0.2 + status_score * 0.2)

        scored.append({
            **rec,
            'priority_score': round(priority_score, 3),
            'actionable': confidence >= 0.60 and status_score > 0
        })

    scored.sort(key=lambda x: x['priority_score'], reverse=True)

    for i, rec in enumerate(scored):
        rec['priority_rank'] = i + 1

    return scored
