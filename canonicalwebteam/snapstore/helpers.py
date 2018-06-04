import os
from werkzeug.routing import BaseConverter


# This code comes from here
# https://coderwall.com/p/gnafxa/adding-custom-url-map-converters-to-flask-blueprint-objects
def add_app_url_map_converter(self, func, name=None):
    """
    Register a custom URL map converters, available application wide.

    :param name: the optional name of the filter, otherwise the function name
                 will be used.
    """
    def register_converter(state):
        state.app.url_map.converters[name or func.__name__] = func

    self.record_once(register_converter)


class RegexConverter(BaseConverter):
    def __init__(self, url_map, *items):
        super(RegexConverter, self).__init__(url_map)
        self.regex = items[0]


def static_url(filename):
    """
    Template function for generating URLs to static assets:
    Given the path for a static file, output a url path
    with a hex hash as a query string for versioning
    """

    filepath = os.path.join('static', filename)
    url = '/' + filepath

    if not os.path.isfile(filepath):
        print('Could not find static file: ' + filepath)
        return url

    # Use MD5 as we care about speed a lot
    # and not security in this case
    file_hash = hashlib.md5()
    with open(filepath, "rb") as file_contents:
        for chunk in iter(lambda: file_contents.read(4096), b""):
            file_hash.update(chunk)

    return url + '?v=' + file_hash.hexdigest()[:7]
