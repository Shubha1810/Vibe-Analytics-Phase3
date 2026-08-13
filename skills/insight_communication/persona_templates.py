"""
Persona communication templates for the insight_communication skill.
Defines formatting rules, tone, and structure for each of the 5 Brightway Retail personas.
"""


PERSONAS = {
    'sarah_mitchell': {
        'name': 'Sarah Mitchell',
        'role': 'Fresh & Grocery Category Manager',
        'department_scope': ['Fresh Produce', 'Bakery', 'Dairy'],
        'tone': 'direct, time-sensitive, action-oriented',
        'lead_with': 'immediate_action',
        'detail_level': 'category_l3',
        'urgency_phrases': [
            'Immediate action required',
            "Today's priority",
            'Before next replenishment cycle',
            'Perishable window closing',
            'Act within 24 hours'
        ],
        'kpi_labels': {
            'stockout_rate': 'Stockout Rate',
            'lost_revenue': 'Lost Revenue ($)',
            'days_of_supply': 'Days of Supply',
            'sell_through_rate': 'Sell-Through %',
            'shrinkage_pct': 'Shrinkage %'
        },
        'chart_preferences': ['waterfall', 'heatmap', 'gauge'],
        'avoid': ['executive summaries', 'quarterly trends', 'long planning horizons'],
        'response_length': 'concise',
        'section_order': ['action', 'evidence', 'context']
    },
    'mark_thompson': {
        'name': 'Mark Thompson',
        'role': 'Consumer Electronics Category Manager',
        'department_scope': ['Consumer Electronics'],
        'tone': 'analytical, margin-focused, competitive',
        'lead_with': 'margin_impact',
        'detail_level': 'brand_and_category_l3',
        'urgency_phrases': [
            "This week's action items",
            'Competitive response window',
            'Before next promotional cycle',
            'Margin protection required',
            'Market share at risk'
        ],
        'kpi_labels': {
            'gross_margin_pct': 'Gross Margin %',
            'competitor_price_index': 'Competitor Price Index',
            'promo_lift_pct': 'Promotional Lift %',
            'inventory_turns': 'Inventory Turns',
            'days_of_supply': 'Days of Cover'
        },
        'chart_preferences': ['bar_chart', 'line_chart', 'comparison_table'],
        'avoid': ['perishable urgency', 'daily operational detail', 'shrinkage focus'],
        'response_length': 'moderate',
        'section_order': ['margin_impact', 'competitive_context', 'recommendations']
    },
    'emily_carter': {
        'name': 'Emily Carter',
        'role': 'Seasonal & Home Category Manager',
        'department_scope': ['Seasonal & Home'],
        'tone': 'season-aware, weather-referenced, planning-oriented',
        'lead_with': 'seasonal_position',
        'detail_level': 'category_l3_with_calendar',
        'urgency_phrases': [
            'Before season-end',
            'Weather window closing',
            'Clearance timing critical',
            'Seasonal transition approaching',
            'Markdown window opens in N weeks'
        ],
        'kpi_labels': {
            'seasonal_sell_through': 'Seasonal Sell-Through %',
            'markdown_effectiveness': 'Markdown Effectiveness',
            'weather_sensitivity': 'Weather Sensitivity Score',
            'inventory_aging_days': 'Inventory Age (days)',
            'weeks_to_season_end': 'Weeks to Season End'
        },
        'chart_preferences': ['timeline', 'area_chart', 'waterfall'],
        'avoid': ['long-term forecasts beyond season', 'supply chain jargon', 'OTIF metrics'],
        'response_length': 'moderate',
        'section_order': ['seasonal_context', 'deviation_analysis', 'clearance_actions']
    },
    'david_park': {
        'name': 'David Park',
        'role': 'Supply Chain Director',
        'department_scope': ['All'],
        'tone': 'exception-driven, supplier-accountable, logistics-focused',
        'lead_with': 'supply_exception',
        'detail_level': 'supplier_and_po',
        'urgency_phrases': [
            'Supplier escalation required',
            'Lead time breach detected',
            'OTIF failure — corrective action needed',
            'DC capacity constraint',
            'Expedite authorization needed'
        ],
        'kpi_labels': {
            'otif_rate': 'OTIF Rate %',
            'fill_rate': 'Fill Rate %',
            'lead_time_days': 'Lead Time (days)',
            'freight_cost_usd': 'Freight Cost ($)',
            'supplier_reliability': 'Supplier Reliability Score'
        },
        'chart_preferences': ['table', 'bar_chart', 'gauge'],
        'avoid': ['category merchandising detail', 'consumer language', 'brand analysis'],
        'response_length': 'concise',
        'section_order': ['exceptions', 'supplier_accountability', 'logistics_actions']
    },
    'lisa_hayes': {
        'name': 'Lisa Hayes',
        'role': 'VP of Merchandising / S&OP Director',
        'department_scope': ['All'],
        'tone': 'strategic, cross-departmental, decision-enabling',
        'lead_with': 'portfolio_summary',
        'detail_level': 'department_level',
        'urgency_phrases': [
            'Board-ready insight',
            'S&OP decision point',
            'Cross-functional implication',
            'Portfolio rebalancing opportunity',
            'Strategic review required'
        ],
        'kpi_labels': {
            'total_revenue': 'Total Revenue ($)',
            'gross_margin_pct': 'Portfolio Margin %',
            'mape_pct': 'Forecast Accuracy (MAPE)',
            'inventory_investment': 'Inventory Investment ($)',
            'lost_sales_total': 'Total Lost Sales ($)'
        },
        'chart_preferences': ['executive_dashboard', 'sparklines', 'comparison_table', 'trend_line'],
        'avoid': ['SKU-level detail', 'operational action items', 'single-store issues'],
        'response_length': 'structured_comprehensive',
        'section_order': ['executive_summary', 'department_highlights', 'decisions_required', 'drill_down_prompts']
    }
}


def get_persona_template(persona_key: str) -> dict:
    """
    Retrieve the communication template for a given persona.

    Args:
        persona_key: One of 'sarah_mitchell', 'mark_thompson', 'emily_carter',
                     'david_park', 'lisa_hayes'

    Returns:
        Dict with full persona template or error if not found
    """
    if persona_key in PERSONAS:
        return PERSONAS[persona_key]
    # Try matching by first name
    for key, persona in PERSONAS.items():
        if persona_key.lower() in key or persona_key.lower() in persona['name'].lower():
            return persona
    return {'error': f'Unknown persona: {persona_key}. Available: {list(PERSONAS.keys())}'}


def format_kpi_value(kpi_name: str, value: float, persona_key: str) -> str:
    """
    Format a KPI value with appropriate label for the persona.

    Args:
        kpi_name: Internal KPI name (e.g., 'gross_margin_pct')
        value: Numeric value
        persona_key: Persona to format for

    Returns:
        Formatted string (e.g., "Gross Margin: 22.4%")
    """
    persona = PERSONAS.get(persona_key, {})
    labels = persona.get('kpi_labels', {})
    label = labels.get(kpi_name, kpi_name.replace('_', ' ').title())

    # Format based on metric type
    if 'pct' in kpi_name or 'rate' in kpi_name:
        return f"{label}: {value:.1f}%"
    elif 'usd' in kpi_name or 'revenue' in kpi_name or 'cost' in kpi_name:
        if abs(value) >= 1000000:
            return f"{label}: ${value/1000000:.1f}M"
        elif abs(value) >= 1000:
            return f"{label}: ${value/1000:.0f}K"
        else:
            return f"{label}: ${value:.2f}"
    elif 'days' in kpi_name:
        return f"{label}: {value:.1f} days"
    else:
        return f"{label}: {value:.2f}"


def select_urgency_phrase(persona_key: str, severity: str) -> str:
    """
    Select an appropriate urgency phrase based on persona and severity.

    Args:
        persona_key: Persona identifier
        severity: One of 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'

    Returns:
        Urgency phrase appropriate for the persona and severity level
    """
    persona = PERSONAS.get(persona_key, {})
    phrases = persona.get('urgency_phrases', ['Action required'])

    if severity == 'CRITICAL':
        return phrases[0] if phrases else 'Immediate action required'
    elif severity == 'HIGH':
        return phrases[1] if len(phrases) > 1 else 'Action required this week'
    elif severity == 'MEDIUM':
        return phrases[2] if len(phrases) > 2 else 'Review recommended'
    else:
        return phrases[-1] if phrases else 'For awareness'


def recommend_charts(analysis_type: str, persona_key: str, data_points: int) -> list:
    """
    Recommend appropriate chart types based on analysis and persona.

    Args:
        analysis_type: One of 'attribution', 'trend', 'comparison', 'forecast', 'status'
        persona_key: Persona identifier
        data_points: Number of data points available

    Returns:
        List of recommended chart specifications
    """
    if data_points < 3:
        return []

    persona = PERSONAS.get(persona_key, {})
    preferences = persona.get('chart_preferences', ['bar_chart'])

    CHART_MAP = {
        'attribution': {
            'primary': 'waterfall',
            'alt': 'horizontal_bar',
            'title_template': 'Demand Driver Attribution — {scope}'
        },
        'trend': {
            'primary': 'line_chart',
            'alt': 'area_chart',
            'title_template': 'Demand Trend — {scope} (Last {periods} Weeks)'
        },
        'comparison': {
            'primary': 'horizontal_bar',
            'alt': 'comparison_table',
            'title_template': '{dimension} Performance Comparison'
        },
        'forecast': {
            'primary': 'area_chart',
            'alt': 'line_chart',
            'title_template': '13-Week Demand Forecast — {scope}'
        },
        'status': {
            'primary': 'gauge',
            'alt': 'bullet_chart',
            'title_template': 'KPI Status — {metric}'
        }
    }

    chart_spec = CHART_MAP.get(analysis_type, CHART_MAP['comparison'])

    # Use persona preference if it matches, otherwise use primary
    recommended_type = chart_spec['primary']
    for pref in preferences:
        if pref in [chart_spec['primary'], chart_spec['alt']]:
            recommended_type = pref
            break

    return [{
        'chart_type': recommended_type,
        'title_template': chart_spec['title_template'],
        'data_points': data_points,
        'persona_optimized': True
    }]
