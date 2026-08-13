"""
Signal profiler for the data_preparation skill.
Checks signal freshness, completeness, and coverage for Demand Sensing data.
"""


def assess_signal_health(null_rates: dict) -> dict:
    """
    Assess health of external signals based on NULL rates.

    Args:
        null_rates: Dict of signal_name -> null_percentage (0-100)

    Returns:
        Dict with per-signal status and overall health
    """
    THRESHOLDS = {'HEALTHY': 5, 'DEGRADED': 20}

    results = {}
    for signal, rate in null_rates.items():
        if rate < THRESHOLDS['HEALTHY']:
            status = 'HEALTHY'
        elif rate < THRESHOLDS['DEGRADED']:
            status = 'DEGRADED'
        else:
            status = 'CRITICAL'
        results[signal] = {'null_rate_pct': round(rate, 2), 'status': status}

    statuses = [v['status'] for v in results.values()]
    if 'CRITICAL' in statuses:
        overall = 'CRITICAL'
    elif 'DEGRADED' in statuses:
        overall = 'DEGRADED'
    else:
        overall = 'HEALTHY'

    return {'signals': results, 'overall_health': overall}


def assess_coverage(actual_combinations: int, expected_combinations: int = 14400) -> dict:
    """
    Assess SKU-store coverage completeness.

    Args:
        actual_combinations: Number of distinct SKU-store pairs observed
        expected_combinations: Expected total (default 14,400 = 450 SKUs × 32 stores)

    Returns:
        Dict with coverage percentage and status
    """
    coverage_pct = (actual_combinations / expected_combinations * 100) if expected_combinations > 0 else 0

    if coverage_pct >= 95:
        status = 'FULL'
    elif coverage_pct >= 80:
        status = 'PARTIAL'
    else:
        status = 'GAPS'

    return {
        'actual': actual_combinations,
        'expected': expected_combinations,
        'coverage_pct': round(coverage_pct, 1),
        'status': status
    }


def assess_freshness(days_since_refresh: int) -> str:
    """
    Classify data freshness based on days since last refresh.

    Args:
        days_since_refresh: Number of days since the most recent data in the table

    Returns:
        Status string: FRESH, STALE, or CRITICAL
    """
    if days_since_refresh <= 1:
        return 'FRESH'
    elif days_since_refresh <= 7:
        return 'STALE'
    else:
        return 'CRITICAL'


def compute_derived_kpis(row: dict) -> dict:
    """
    Compute derived demand sensing KPIs from a single row of FACT_DEMAND_DAILY.

    Args:
        row: Dict with column values from FACT_DEMAND_DAILY

    Returns:
        Dict with computed KPI values
    """
    def safe_float(val, default=0.0):
        try:
            return float(val) if val is not None else default
        except (ValueError, TypeError):
            return default

    units_sold = safe_float(row.get('UNITS_SOLD', row.get('units_sold')))
    actual_demand = safe_float(row.get('ACTUAL_DEMAND_UNITS', row.get('actual_demand_units')))
    forecast_units = safe_float(row.get('FORECAST_UNITS', row.get('forecast_units')))
    regular_price = safe_float(row.get('REGULAR_PRICE_AMT', row.get('regular_price_amt')))
    lost_units = safe_float(row.get('LOST_SALES_UNITS_EST', row.get('lost_sales_units_est')))
    beginning_oh = safe_float(row.get('BEGINNING_ON_HAND_QTY', row.get('beginning_on_hand_qty')))
    ending_oh = safe_float(row.get('ENDING_ON_HAND_QTY', row.get('ending_on_hand_qty')))
    on_order = safe_float(row.get('ON_ORDER_QTY', row.get('on_order_qty')))
    in_transit = safe_float(row.get('IN_TRANSIT_QTY', row.get('in_transit_qty')))
    gross_sales = safe_float(row.get('GROSS_SALES_AMT', row.get('gross_sales_amt')))
    deviation_pct = safe_float(row.get('DEMAND_DEVIATION_PCT', row.get('demand_deviation_pct')))

    kpis = {}

    # Lost revenue
    kpis['lost_revenue'] = round(lost_units * regular_price, 2)

    # Sell-through rate
    kpis['sell_through_rate'] = round(units_sold / beginning_oh, 4) if beginning_oh > 0 else None

    # Forecast error (absolute percentage)
    if actual_demand > 0:
        kpis['abs_pct_error'] = round(abs(forecast_units - actual_demand) / actual_demand * 100, 2)
        kpis['forecast_bias'] = round((forecast_units - actual_demand) / actual_demand * 100, 2)
    else:
        kpis['abs_pct_error'] = None
        kpis['forecast_bias'] = None

    # Effective coverage (inventory position)
    kpis['effective_coverage'] = round(ending_oh + on_order + in_transit, 0)

    # Revenue at stake (daily)
    kpis['daily_revenue_at_stake'] = round(abs(deviation_pct / 100) * gross_sales, 2) if gross_sales > 0 else 0

    return kpis
