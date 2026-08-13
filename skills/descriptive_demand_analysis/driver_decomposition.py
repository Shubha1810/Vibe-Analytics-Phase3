"""
Demand driver decomposition for the descriptive_demand_analysis skill.
Decomposes total demand deviation into per-signal and per-dimension contributions.
Implements the Root Cause Analysis Agent logic within the unified skill.
"""
import json


def driver_waterfall(data: list, scope_dim: str) -> dict:
    """
    Decompose demand deviation by dimension, showing driver contributions per segment.

    Args:
        data: List of dicts from FACT_DEMAND_DAILY with driver columns
        scope_dim: Dimension to decompose by (e.g., 'CATEGORY_L3', 'STORE_CLUSTER_ID', 'REGION')

    Returns:
        Dict with per-segment driver breakdown and totals
    """
    DRIVERS = [
        'DRIVER_WEATHER_PP', 'DRIVER_PROMO_PP',
        'DRIVER_COMPETITOR_PP', 'DRIVER_DIGITAL_PP', 'DRIVER_RESIDUAL_PP'
    ]

    segments = {}
    for row in data:
        dim_val = str(row.get(scope_dim, row.get(scope_dim.lower(), 'Unknown')))
        if dim_val not in segments:
            segments[dim_val] = {d: [] for d in DRIVERS}
            segments[dim_val]['DEMAND_DEVIATION_PCT'] = []
            segments[dim_val]['count'] = 0

        for d in DRIVERS:
            val = float(row.get(d, row.get(d.lower(), 0)) or 0)
            segments[dim_val][d].append(val)

        dev = float(row.get('DEMAND_DEVIATION_PCT',
                            row.get('demand_deviation_pct', 0)) or 0)
        segments[dim_val]['DEMAND_DEVIATION_PCT'].append(dev)
        segments[dim_val]['count'] += 1

    results = []
    for seg, values in segments.items():
        n = values['count']
        if n == 0:
            continue

        seg_result = {
            'segment': seg,
            'observation_count': n,
            'avg_deviation_pct': round(sum(values['DEMAND_DEVIATION_PCT']) / n, 2),
            'drivers': {}
        }

        for d in DRIVERS:
            avg_val = sum(values[d]) / n
            seg_result['drivers'][d] = round(avg_val, 2)

        driver_sum = sum(seg_result['drivers'].values())
        seg_result['identity_check'] = abs(driver_sum - seg_result['avg_deviation_pct']) < 5.0
        seg_result['driver_sum'] = round(driver_sum, 2)
        seg_result['identity_gap_pp'] = round(abs(driver_sum - seg_result['avg_deviation_pct']), 2)

        results.append(seg_result)

    results.sort(key=lambda x: abs(x['avg_deviation_pct']), reverse=True)

    all_devs = [r['avg_deviation_pct'] for r in results]
    total_avg_dev = sum(all_devs) / len(all_devs) if all_devs else 0

    if results and total_avg_dev != 0:
        top3_contribution = sum(
            abs(r['avg_deviation_pct']) for r in results[:3]
        ) / sum(abs(r['avg_deviation_pct']) for r in results) * 100
    else:
        top3_contribution = 0

    return {
        'dimension': scope_dim,
        'total_segments': len(results),
        'overall_avg_deviation': round(total_avg_dev, 2),
        'top3_concentration_pct': round(top3_contribution, 1),
        'concentration_pattern': 'CONCENTRATED' if top3_contribution > 70 else 'MIXED' if top3_contribution > 50 else 'BROAD',
        'segments': results[:10]
    }


def revenue_at_stake(data: list, days_forward: int = 14) -> dict:
    """
    Estimate revenue at stake from a demand deviation.

    Args:
        data: Recent FACT_DEMAND_DAILY rows for affected scope
        days_forward: Days to project the deviation forward

    Returns:
        Dict with revenue-at-stake estimate
    """
    total_daily_revenue = 0
    total_deviation_pct = 0
    count = 0

    for row in data:
        rev = float(row.get('GROSS_SALES_AMT', row.get('gross_sales_amt', 0)) or 0)
        dev = float(row.get('DEMAND_DEVIATION_PCT', row.get('demand_deviation_pct', 0)) or 0)
        total_daily_revenue += rev
        total_deviation_pct += dev
        count += 1

    if count == 0:
        return {'revenue_at_stake_usd': 0, 'confidence': 'LOW', 'days_projected': days_forward}

    avg_daily_revenue = total_daily_revenue / count
    avg_deviation = total_deviation_pct / count
    incremental_daily = avg_daily_revenue * (abs(avg_deviation) / 100)
    revenue_at_stake_est = incremental_daily * days_forward

    return {
        'avg_daily_revenue': round(avg_daily_revenue, 2),
        'avg_deviation_pct': round(avg_deviation, 2),
        'incremental_daily_revenue': round(incremental_daily, 2),
        'days_projected': days_forward,
        'revenue_at_stake_usd': round(revenue_at_stake_est, 2),
        'confidence': 'HIGH' if count >= 28 else 'MEDIUM' if count >= 7 else 'LOW'
    }


def counterfactual_analysis(data: list, driver_to_remove: str) -> dict:
    """
    Perform counterfactual validation by removing a driver's contribution.

    Args:
        data: List of dicts with driver columns and demand_deviation_pct
        driver_to_remove: Column name of driver to remove (e.g., 'DRIVER_WEATHER_PP')

    Returns:
        Dict with residual deviation after removing the specified driver
    """
    total_deviation = 0
    total_driver_contribution = 0
    count = 0

    for row in data:
        dev = float(row.get('DEMAND_DEVIATION_PCT', row.get('demand_deviation_pct', 0)) or 0)
        driver_val = float(row.get(driver_to_remove, row.get(driver_to_remove.lower(), 0)) or 0)
        total_deviation += dev
        total_driver_contribution += driver_val
        count += 1

    if count == 0:
        return {'error': 'No data provided'}

    avg_deviation = total_deviation / count
    avg_driver = total_driver_contribution / count
    residual_without_driver = avg_deviation - avg_driver

    driver_confirmed = abs(residual_without_driver) <= 10.0

    return {
        'original_deviation_pct': round(avg_deviation, 2),
        'driver_removed': driver_to_remove,
        'driver_avg_contribution_pp': round(avg_driver, 2),
        'residual_without_driver_pct': round(residual_without_driver, 2),
        'driver_confirmed_as_primary': driver_confirmed,
        'conclusion': (
            f"CONFIRMED: Removing {driver_to_remove} brings residual to {residual_without_driver:.1f}% (within ±10% bounds)"
            if driver_confirmed else
            f"MULTIPLE CAUSES: Residual after removing {driver_to_remove} is {residual_without_driver:.1f}% (still elevated)"
        )
    }
