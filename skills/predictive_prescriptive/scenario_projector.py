"""
Scenario projection engine for the predictive_prescriptive skill.
Handles scenario overlay simulation, confidence band computation, and revenue impact estimation.
"""


def project_scenario(baseline_forecast: list, scenario_overlay_pct: float,
                     uncertainty_premium_pp: float = 5.0) -> dict:
    """
    Apply a scenario overlay to baseline forecast and compute adjusted confidence bands.

    Args:
        baseline_forecast: List of dicts with keys:
            - week_start_date, forecast_units, forecast_lower_bound, forecast_upper_bound
        scenario_overlay_pct: Percentage adjustment to apply (e.g., +28.0 for 28% uplift)
        uncertainty_premium_pp: Additional uncertainty to add to confidence bands (default 5pp)

    Returns:
        Dict with scenario-adjusted forecast including new P10/P90 bands
    """
    adjusted_weeks = []
    total_baseline_units = 0
    total_scenario_units = 0

    for week in baseline_forecast:
        point = float(week.get('forecast_units', week.get('FORECAST_UNITS', 0)) or 0)
        p10 = float(week.get('forecast_lower_bound', week.get('FORECAST_LOWER_BOUND', 0)) or 0)
        p90 = float(week.get('forecast_upper_bound', week.get('FORECAST_UPPER_BOUND', 0)) or 0)
        week_date = week.get('week_start_date', week.get('WEEK_START_DATE', ''))

        # Apply scenario overlay
        multiplier = 1 + (scenario_overlay_pct / 100)
        scenario_point = round(point * multiplier, 0)

        # Widen confidence bands by uncertainty premium
        band_width = p90 - p10
        expanded_width = band_width * (1 + uncertainty_premium_pp / 100)
        scenario_p10 = round(scenario_point - expanded_width / 2, 0)
        scenario_p90 = round(scenario_point + expanded_width / 2, 0)

        # Confidence width metric
        conf_width_pct = round((scenario_p90 - scenario_p10) / scenario_point * 100, 1) if scenario_point > 0 else 0

        adjusted_weeks.append({
            'week_start_date': week_date,
            'baseline_forecast': round(point, 0),
            'scenario_forecast': scenario_point,
            'delta_units': round(scenario_point - point, 0),
            'scenario_p10': max(0, scenario_p10),
            'scenario_p90': scenario_p90,
            'confidence_width_pct': conf_width_pct,
            'confidence_level': 'HIGH' if conf_width_pct < 20 else 'MEDIUM' if conf_width_pct < 40 else 'LOW'
        })

        total_baseline_units += point
        total_scenario_units += scenario_point

    return {
        'scenario_overlay_pct': scenario_overlay_pct,
        'uncertainty_premium_pp': uncertainty_premium_pp,
        'weeks_projected': len(adjusted_weeks),
        'total_baseline_units': round(total_baseline_units, 0),
        'total_scenario_units': round(total_scenario_units, 0),
        'total_delta_units': round(total_scenario_units - total_baseline_units, 0),
        'avg_confidence_width_pct': round(
            sum(w['confidence_width_pct'] for w in adjusted_weeks) / len(adjusted_weeks), 1
        ) if adjusted_weeks else 0,
        'weekly_projections': adjusted_weeks
    }


def estimate_revenue_impact(delta_units: float, avg_price: float,
                            weeks: int, confidence: float) -> dict:
    """
    Estimate revenue impact of a demand scenario or deviation.

    Args:
        delta_units: Weekly incremental units (positive = upside, negative = downside)
        avg_price: Average selling price per unit
        weeks: Number of weeks to project
        confidence: Confidence score (0-1) for the estimate

    Returns:
        Dict with revenue impact estimates at different confidence levels
    """
    point_estimate = delta_units * avg_price * weeks

    # Apply confidence-based range
    lower_bound = point_estimate * (1 - (1 - confidence) * 0.5)
    upper_bound = point_estimate * (1 + (1 - confidence) * 0.5)

    return {
        'weekly_delta_units': round(delta_units, 0),
        'avg_price_usd': round(avg_price, 2),
        'projection_weeks': weeks,
        'confidence_score': round(confidence, 2),
        'revenue_impact_point_usd': round(point_estimate, 2),
        'revenue_impact_lower_usd': round(lower_bound, 2),
        'revenue_impact_upper_usd': round(upper_bound, 2),
        'impact_direction': 'UPSIDE' if point_estimate > 0 else 'DOWNSIDE',
        'materiality': (
            'HIGH' if abs(point_estimate) > 100000 else
            'MEDIUM' if abs(point_estimate) > 50000 else
            'LOW'
        )
    }


def compute_confidence_score(forecast_mape: float, signal_availability: dict,
                             scenario_support: bool = False,
                             historical_pattern: bool = False) -> dict:
    """
    Compute a recommendation confidence score based on multiple factors.

    Args:
        forecast_mape: Historical MAPE percentage for this scope
        signal_availability: Dict of signal_name -> available (bool)
        scenario_support: Whether scenario data supports the direction
        historical_pattern: Whether historical patterns confirm the trend

    Returns:
        Dict with confidence score breakdown and final score
    """
    # Base confidence from forecast accuracy
    if forecast_mape < 10:
        base = 0.85
    elif forecast_mape < 20:
        base = 0.70
    elif forecast_mape < 30:
        base = 0.55
    else:
        base = 0.40

    adjustments = []

    # Scenario support boost
    if scenario_support:
        adjustments.append({'factor': 'scenario_data_support', 'adjustment': +0.10})

    # Historical pattern confirmation
    if historical_pattern:
        adjustments.append({'factor': 'historical_pattern_match', 'adjustment': +0.10})

    # Signal availability penalties
    missing_signals = [s for s, avail in signal_availability.items() if not avail]
    if missing_signals:
        penalty = -0.05 * len(missing_signals)
        adjustments.append({'factor': f'missing_signals ({len(missing_signals)})', 'adjustment': penalty})

    # Compute final
    total_adjustment = sum(a['adjustment'] for a in adjustments)
    final_score = max(0.0, min(1.0, base + total_adjustment))

    # GR-008 check
    actionable = final_score >= 0.60

    return {
        'base_confidence': round(base, 2),
        'forecast_mape_pct': round(forecast_mape, 1),
        'adjustments': adjustments,
        'total_adjustment': round(total_adjustment, 2),
        'final_score': round(final_score, 2),
        'actionable': actionable,
        'gr008_status': 'PASS' if actionable else 'SUPPRESSED',
        'classification': (
            'HIGH' if final_score >= 0.80 else
            'MEDIUM' if final_score >= 0.60 else
            'LOW (SUPPRESSED)'
        )
    }
