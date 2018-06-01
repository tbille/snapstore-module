import bleach
import re


def get_default_channel(snap_name):
    """
    Get's the default channel of 'stable' unless the snap_name is node.

    This is a temporary* hack to get around nodejs not using 'latest'
    as their default.

    * depending on snapd and store work (not in the 18.10 cycle)
    """
    if snap_name == 'node':
        return '10/stable'

    return 'stable'


def split_description_into_paragraphs(unformatted_description):
    """Split a long description into a set of paragraphs. We assume each
    paragraph is separated by 2 or more line-breaks in the description.

    :param unformatted_description: The paragraph to format

    :returns: The formatted paragraphs
    """
    description = unformatted_description.strip()
    paragraphs = re.compile(r'[\n\r]{2,}').split(description)
    formatted_paragraphs = []

    # Sanitise paragraphs
    def external(attrs, new=False):
        url_parts = urlparse(attrs[(None, "href")])
        if url_parts.netloc and url_parts.netloc != 'snapcraft.io':
            if (None, "class") not in attrs:
                attrs[(None, "class")] = "p-link--external"
            elif "p-link--external" not in attrs[(None, "class")]:
                attrs[(None, "class")] += " p-link--external"
        return attrs

    for paragraph in paragraphs:
        callbacks = bleach.linkifier.DEFAULT_CALLBACKS
        callbacks.append(external)

        paragraph = bleach.clean(paragraph, tags=[])
        paragraph = bleach.linkify(paragraph, callbacks=callbacks)

        formatted_paragraphs.append(paragraph.replace('\n', '<br />'))

    return formatted_paragraphs


def convert_channel_maps(channel_maps_list):
    """
    Converts channel maps list to format easier to manipulate

    Example:
    - Input:
    [
      {
        'architecture': 'arch'
        'map': [{'info': 'release', ...}, ...],
        'track': 'track 1'
      },
      ...
    ]
    - Output:
    {
      'arch': {
        'track 1': [{'info': 'release', ...}, ...],
        ...
      },
      ...
    }

    :param channel_maps_list: The channel maps list returned by the API

    :returns: The channel maps reshaped
    """
    channel_maps = {}
    for channel_map in channel_maps_list:
        arch = channel_map.get('architecture')
        track = channel_map.get('track')
        if arch not in channel_maps:
            channel_maps[arch] = {}
        channel_maps[arch][track] = []

        for channel in channel_map['map']:
            if channel.get('info'):
                channel_maps[arch][track].append(channel)

    return channel_maps
