import flask
import talisker.flask
import canonicalwebteam.snapstore.helpers as helpers
from canonicalwebteam.snapstore.store import store_views


def create_app():
    app = flask.Flask(__name__)
    app.register_blueprint(store_views)
    talisker.flask.register(app)

    return app
