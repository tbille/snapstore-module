from setuptools import setup

setup(
    name='canonicalwebteam.snapstore',
    version='0.1',
    author='Canonical Webteam',
    author_email='thomas.bille@canonical.com',
    url='https://github.com/canonical-webteam/snapstore-module',
    license='AGPLv3',
    description='Snapstore module',
    packages=[
        'canonicalwebteam.snapstore',
    ],
    install_requires=[
        'bleach==2.0.0',
        'canonicalwebteam.snapstoreapi==0.4.4',
        'Flask==1.0.2',
        'humanize==0.5.1',
    ],
)
