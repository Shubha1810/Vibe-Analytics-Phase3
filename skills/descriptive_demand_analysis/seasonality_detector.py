"""
Seasonality and trend detection for the descriptive_demand_analysis skill.
Implements the Trend Discovery Agent logic with NRF 4-4-5 fiscal calendar awareness.
"""


def detect_trend(time_series: list) -> dict:
    """
    Detect trend direction and strength from a time series of demand deviations.

    Args:
        time_series: List of dicts with 'fiscal_week' and 'avg_deviation_pct' keys,
                     sorted chronologically

    Returns:
        Dict with trend direction, strength, and changepoint detection
    """
    if len(time_series) < 4:
        return {'direction': 'INSUFFICIENT_DATA', 'confidence': 'LOW'}

    values = [float(row.get('avg_deviation_pct', row.get('AVG_DEVIATION_PCT', 0)) or 0)
              for row in time_series]
    n = len(values)

    # Linear trend via least-squares slope
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    numerator = sum((i - x_mean) * (values[i] - y_mean) for i in range(n))
    denominator = sum((i - x_mean) ** 2 for i in range(n))
    slope = numerator / denominator if denominator != 0 else 0

    # Trend classification
    if abs(slope) < 0.5:
        direction = 'STABLE'
    elif slope > 0:
        direction = 'INCREASING'
    else:
        direction = 'DECREASING'

    # Trend strength (R-squared approximation)
    predicted = [y_mean + slope * (i - x_mean) for i in range(n)]
    ss_res = sum((values[i] - predicted[i]) ** 2 for i in range(n))
    ss_tot = sum((v - y_mean) ** 2 for v in values)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    return {
        'direction': direction,
        'slope_pp_per_week': round(slope, 3),
        'r_squared': round(r_squared, 3),
        'strength': 'STRONG' if r_squared > 0.7 else 'MODERATE' if r_squared > 0.4 else 'WEAK',
        'start_value': round(values[0], 2),
        'end_value': round(values[-1], 2),
        'total_change_pp': round(values[-1] - values[0], 2),
        'periods_analyzed': n
    }


def detect_changepoints(time_series: list, threshold_pp: float = 5.0) -> list:
    """
    Detect abrupt shifts (changepoints) in demand deviation patterns.

    Args:
        time_series: List of dicts with 'fiscal_week' and 'avg_deviation_pct'
        threshold_pp: Minimum absolute change between consecutive periods to flag (default 5pp)

    Returns:
        List of detected changepoints with context
    """
    if len(time_series) < 3:
        return []

    values = [float(row.get('avg_deviation_pct', row.get('AVG_DEVIATION_PCT', 0)) or 0)
              for row in time_series]
    weeks = [row.get('fiscal_week', row.get('FISCAL_WEEK', i))
             for i, row in enumerate(time_series)]

    changepoints = []
    for i in range(1, len(values)):
        delta = values[i] - values[i - 1]
        if abs(delta) >= threshold_pp:
            # Compute local context (mean of 2 before vs 2 after)
            before_mean = sum(values[max(0, i-2):i]) / min(i, 2) if i > 0 else values[0]
            after_mean = sum(values[i:min(len(values), i+2)]) / min(2, len(values) - i)

            changepoints.append({
                'fiscal_week': weeks[i],
                'position_index': i,
                'delta_pp': round(delta, 2),
                'direction': 'SPIKE' if delta > 0 else 'DROP',
                'before_avg': round(before_mean, 2),
                'after_avg': round(after_mean, 2),
                'magnitude': 'MAJOR' if abs(delta) > threshold_pp * 2 else 'MODERATE',
                'sustained': abs(after_mean - before_mean) > threshold_pp * 0.5
            })

    return changepoints


def compute_moving_averages(time_series: list) -> dict:
    """
    Compute 7-period and 28-period (4-week) moving averages for smoothing.

    Args:
        time_series: List of dicts with 'avg_deviation_pct' (daily or weekly grain)

    Returns:
        Dict with short-term and long-term moving averages
    """
    values = [float(row.get('avg_deviation_pct', row.get('AVG_DEVIATION_PCT', 0)) or 0)
              for row in time_series]
    n = len(values)

    def moving_avg(data, window):
        if len(data) < window:
            return [round(sum(data) / len(data), 2)] * len(data)
        result = []
        for i in range(len(data)):
            start = max(0, i - window + 1)
            result.append(round(sum(data[start:i+1]) / (i - start + 1), 2))
        return result

    ma_short = moving_avg(values, min(7, n))
    ma_long = moving_avg(values, min(28, n))

    # Current position relative to moving averages
    current = values[-1] if values else 0
    current_vs_short = round(current - ma_short[-1], 2) if ma_short else 0
    current_vs_long = round(current - ma_long[-1], 2) if ma_long else 0

    return {
        'raw_values': [round(v, 2) for v in values],
        'ma_short_term': ma_short,
        'ma_long_term': ma_long,
        'current_value': round(current, 2),
        'current_vs_short_ma': current_vs_short,
        'current_vs_long_ma': current_vs_long,
        'signal': (
            'ABOVE_BOTH' if current_vs_short > 0 and current_vs_long > 0 else
            'BELOW_BOTH' if current_vs_short < 0 and current_vs_long < 0 else
            'CROSSING_UP' if current_vs_short > 0 and current_vs_long < 0 else
            'CROSSING_DOWN'
        )
    }


def yoy_comparison(current_period: dict, prior_year_period: dict) -> dict:
    """
    Compare current fiscal period against same period in prior year.

    Args:
        current_period: Dict with 'fiscal_week'/'fiscal_month', 'avg_deviation_pct', 'total_units'
        prior_year_period: Dict with same keys for the prior fiscal year

    Returns:
        Dict with YoY comparison metrics
    """
    curr_dev = float(current_period.get('avg_deviation_pct', 0) or 0)
    prior_dev = float(prior_year_period.get('avg_deviation_pct', 0) or 0)
    curr_units = float(current_period.get('total_units', 0) or 0)
    prior_units = float(prior_year_period.get('total_units', 0) or 0)

    dev_change = curr_dev - prior_dev
    units_change_pct = ((curr_units - prior_units) / prior_units * 100) if prior_units > 0 else 0

    return {
        'current_period_deviation': round(curr_dev, 2),
        'prior_year_deviation': round(prior_dev, 2),
        'yoy_deviation_change_pp': round(dev_change, 2),
        'current_units': round(curr_units, 0),
        'prior_year_units': round(prior_units, 0),
        'yoy_units_change_pct': round(units_change_pct, 2),
        'interpretation': (
            f"Deviation {'worsened' if abs(curr_dev) > abs(prior_dev) else 'improved'} by "
            f"{abs(dev_change):.1f}pp vs same period last year. "
            f"Volume {'up' if units_change_pct > 0 else 'down'} {abs(units_change_pct):.1f}% YoY."
        )
    }
