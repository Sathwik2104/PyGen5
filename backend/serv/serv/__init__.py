import pymysql

pymysql.install_as_MySQLdb()

# Bypass strict MySQL 8.4 requirement in Django 6.1+ for TiDB Cloud & MySQL 8.0 compatibility
try:
    from django.db.backends.mysql.base import DatabaseWrapper
    DatabaseWrapper.check_database_version_supported = lambda self: None

    from django.db.backends.mysql.features import DatabaseFeatures
    DatabaseFeatures.minimum_database_version = property(lambda self: (8, 0))
except Exception:
    pass
