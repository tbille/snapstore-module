import flask

store_views = flask.Blueprint(
    'store_views', __name__, template_folder='templates')



@store_views.route('/')
def home():
    return flask.render_template(
        'index.html')
