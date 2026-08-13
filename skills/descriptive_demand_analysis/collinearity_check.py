"""
Multi-collinearity detection for demand driver signals.
Part of the descriptive_demand_analysis skill.
Identifies overlapping signals and recommends dampening factors to avoid double-counting.
"""


def correlation(x: list, y: list) -> float:
    """Pearson correlation coefficient between two numeric lists."""
    n = len(x)
    if n < 3:
        return 0.0

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    cov = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    std_x = (sum((xi - mean_x) ** 2 for xi in x) / n) ** 0.5
    std_y = (sum((yi - mean_y) ** 2 for yi in y) / n) ** 0.5

    if std_x == 0 or std_y == 0:
        return 0.0

    return round(cov / (n * std_x * std_y), 3)


def check_collinearity(data: list) -> dict:
    """
    Check pairwise correlations between demand signal proxies.

    Args:
        data: List of dicts with signal columns from FACT_DEMAND_DAILY:
              - TEMPERATURE_ANOMALY_F (weather proxy)
              - PROMO_DISCOUNT_PCT (promo proxy)
              - COMPETITOR_PRICE_INDEX (competitor proxy)
              - GOOGLE_TRENDS_SCORE (digital proxy)

    Returns:
        Dict with correlation matrix, flagged pairs, and dampening recommendations
    """
    SIGNAL_MAP = {
        'weather': 'TEMPERATURE_ANOMALY_F',
        'promo': 'PROMO_DISCOUNT_PCT',
        'competitor': 'COMPETITOR_PRICE_INDEX',
        'digital': 'GOOGLE_TRENDS_SCORE'
    }

    KNOWN_COLLINEARITIES = {
        'weather_x_digital': {
            'expected_range': (0.4, 0.7),
            'explanation': 'Heat drives both produce demand AND recipe/product searches online'
        },
        'promo_x_competitor': {
            'expected_range': (0.1, 0.4),
            'explanation': 'Promotions may respond to competitor pricing, creating mild correlation'
        }
    }

    signals = {name: [] for name in SIGNAL_MAP}
    for row in data:
        for name, col in SIGNAL_MAP.items():
            val = float(row.get(col, row.get(col.lower(), 0)) or 0)
            signals[name].append(val)

    signal_names = list(SIGNAL_MAP.keys())
    correlations = {}
    flagged_pairs = []

    for i in range(len(signal_names)):
        for j in range(i + 1, len(signal_names)):
            s1, s2 = signal_names[i], signal_names[j]
            r = correlation(signals[s1], signals[s2])
            pair_key = f"{s1}_x_{s2}"
            correlations[pair_key] = r

            if abs(r) > 0.5:
                known = KNOWN_COLLINEARITIES.get(pair_key, {})
                dampening_factor = round(1 - abs(r) * 0.25, 3)

                flagged_pairs.append({
                    'signal_1': s1,
                    'signal_2': s2,
                    'correlation': r,
                    'severity': 'HIGH' if abs(r) > 0.7 else 'MODERATE',
                    'known_relationship': known.get('explanation', 'No prior expectation'),
                    'dampening_recommendation': {
                        'target_signal': s2,
                        'dampening_factor': dampening_factor,
                        'explanation': (
                            f"{s1} and {s2} share {abs(r)*100:.0f}% correlation. "
                            f"Dampen {s2} (smaller contributor) by factor {dampening_factor} "
                            f"to avoid double-counting {abs(r)*25:.0f}% of the shared signal."
                        )
                    }
                })

    return {
        'correlation_matrix': correlations,
        'flagged_pairs': flagged_pairs,
        'collinearity_detected': len(flagged_pairs) > 0,
        'total_pairs_checked': len(correlations),
        'sample_size': len(signals.get('weather', [])),
        'recommendation': (
            'Apply dampening to flagged pairs before reporting final attribution.'
            if flagged_pairs else
            'No significant collinearity detected. Report raw attribution values.'
        )
    }


def apply_dampening(attribution: dict, flagged_pairs: list) -> dict:
    """
    Apply dampening factors to attribution values based on collinearity findings.

    Args:
        attribution: Dict of driver_name -> contribution_pp (e.g., {'weather': 12.6, 'digital': 2.8})
        flagged_pairs: List of flagged pairs from check_collinearity

    Returns:
        Dict with original and dampened attribution values
    """
    dampened = dict(attribution)

    adjustments = []
    for pair in flagged_pairs:
        target = pair['dampening_recommendation']['target_signal']
        factor = pair['dampening_recommendation']['dampening_factor']

        if target in dampened:
            original_val = dampened[target]
            dampened_val = round(original_val * factor, 2)
            adjustment = round(original_val - dampened_val, 2)
            dampened[target] = dampened_val

            adjustments.append({
                'signal': target,
                'original_pp': original_val,
                'dampened_pp': dampened_val,
                'adjustment_pp': adjustment,
                'reason': f"Correlated with {pair['signal_1']} (r={pair['correlation']})"
            })

    # Redistribute dampened amount to residual
    total_adjustment = sum(a['adjustment_pp'] for a in adjustments)
    if 'residual' in dampened:
        dampened['residual'] = round(dampened['residual'] + total_adjustment, 2)

    return {
        'original_attribution': attribution,
        'dampened_attribution': dampened,
        'adjustments_applied': adjustments,
        'total_redistribution_to_residual_pp': round(total_adjustment, 2)
    }
