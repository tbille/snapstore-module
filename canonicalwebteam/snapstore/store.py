import flask
import humanize
from dateutil import parser
import canonicalwebteam.snapstore.helpers as helpers
import canonicalwebteam.snapstore.logic as logic
import canonicalwebteam.snapstoreapi.public_api as api
import canonicalwebteam.snapstoreapi.metrics.helper as metrics_helper
from canonicalwebteam.snapstoreapi.metrics.metrics import (
    CountryDevices,
    OsMetric
)
from canonicalwebteam.snapstoreapi.exceptions import (
    ApiError,
    ApiTimeoutError,
    ApiResponseDecodeError,
    ApiResponseError,
    ApiResponseErrorList,
    ApiConnectionError
)

# monkey-patch the Blueprint object to allow addition of URL map converters
flask.Blueprint.add_app_url_map_converter = helpers.add_app_url_map_converter

# register the URL map converters that are required
store_views = flask.Blueprint(
    'store_views', __name__, template_folder='templates')

store_views.add_app_url_map_converter(helpers.RegexConverter, 'regex')


def _handle_errors(api_error: ApiError):
    status_code = 502
    error = {
        'message': str(api_error)
    }

    if type(api_error) is ApiTimeoutError:
        status_code = 504
    elif type(api_error) is ApiResponseDecodeError:
        status_code = 502
    elif type(api_error) is ApiResponseErrorList:
        error['errors'] = api_error.errors
        status_code = 502
    elif type(api_error) is ApiResponseError:
        status_code = 502
    elif type(api_error) is ApiConnectionError:
        status_code = 502

    return status_code, error


@store_views.context_processor
def utility_processor():
    """
    This defines the set of properties and functions that will be added
    to the default context for processing templates. All these items
    can be used in all templates
    """
    return {
        'static_url': helpers.static_url,
    }


@store_views.route('/')
def home():
    return flask.render_template(
        'index.html')


@store_views.route('/<regex("[a-z0-9-]*[a-z][a-z0-9-]*"):snap_name>')
def snap_details(snap_name):
    """
    A view to display the snap details page for specific snaps.

    This queries the snapcraft API (api.snapcraft.io) and passes
    some of the data through to the snap-details.html template,
    with appropriate sanitation.
    """

    error_info = {}
    default_channel = logic.get_default_channel(snap_name)

    try:
        details = api.get_snap_details(
                snap_name, default_channel)
    except ApiTimeoutError as api_timeout_error:
        flask.abort(504, str(api_timeout_error))
    except ApiResponseDecodeError as api_response_decode_error:
        flask.abort(502, str(api_response_decode_error))
    except ApiResponseErrorList as api_response_error_list:
        if api_response_error_list.status_code == 404:
            flask.abort(404, 'No snap named {}'.format(snap_name))
        else:
            error_messages = ', '.join(api_response_error_list.errors.key())
            flask.abort(502, error_messages)
    except ApiResponseError as api_response_error:
        flask.abort(502, str(api_response_error))
    except ApiError as api_error:
        flask.abort(502, str(api_error))

    formatted_paragraphs = logic.split_description_into_paragraphs(
        details['description'])

    channel_maps_list = logic.convert_channel_maps(
        details.get('channel_maps_list'))

    end = metrics_helper.get_last_metrics_processed_date()
    country_metric_name = 'weekly_installed_base_by_country_percent'
    os_metric_name = 'weekly_installed_base_by_operating_system_normalized'

    metrics_query_json = [
        metrics_helper.get_filter(
            metric_name=country_metric_name,
            snap_id=details['snap_id'],
            start=end,
            end=end),
        metrics_helper.get_filter(
            metric_name=os_metric_name,
            snap_id=details['snap_id'],
            start=end,
            end=end)]

    status_code = 200
    try:
        metrics_response = api.get_public_metrics(
            snap_name,
            metrics_query_json)
    except ApiError as api_error:
        status_code, error_info = _handle_errors(api_error)

    oses = metrics_helper.find_metric(metrics_response, os_metric_name)
    os_metrics = OsMetric(
        name=oses['metric_name'],
        series=oses['series'],
        buckets=oses['buckets'],
        status=oses['status'])

    territories = metrics_helper.find_metric(
        metrics_response, country_metric_name)
    country_devices = CountryDevices(
        name=territories['metric_name'],
        series=territories['series'],
        buckets=territories['buckets'],
        status=territories['status'],
        private=False)

    # filter out banner and banner-icon images from screenshots
    screenshots = [
        m['url'] for m in details['media']
        if m['type'] == "screenshot" and "banner" not in m['url']
    ]
    icons = [m['url'] for m in details['media'] if m['type'] == "icon"]

    context = {
        # Data direct from details API
        'snap_title': details['title'],
        'package_name': details['package_name'],
        'icon_url': icons[0] if icons else None,
        'version': details['version'],
        'revision': details['revision'],
        'license': details['license'],
        'publisher': details['publisher'],
        'screenshots': screenshots,
        'prices': details['prices'],
        'contact': details.get('contact'),
        'website': details.get('website'),
        'summary': details['summary'],
        'description_paragraphs': formatted_paragraphs,
        'channel_map': channel_maps_list,
        'default_channel': default_channel,

        # Transformed API data
        'filesize': humanize.naturalsize(details['binary_filesize']),
        'last_updated': (
            humanize.naturaldate(
                parser.parse(details.get('last_updated'))
            )
        ),
        'last_updated_raw': details.get('last_updated'),

        # Data from metrics API
        'countries': country_devices.country_data,
        'normalized_os': os_metrics.os,

        # Context info
        'is_linux': (
            'Linux' in flask.request.headers.get('User-Agent', '') and
            'Android' not in flask.request.headers.get('User-Agent', '')
        ),

        'error_info': error_info
    }

    return flask.render_template(
        'snap-details.html',
        **context
    ), status_code
