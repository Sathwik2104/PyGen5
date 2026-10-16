import os
from django.core.management.base import BaseCommand
from django.core.management import call_command
from trywise.models import Product

class Command(BaseCommand):
    help = 'Automatically seed cloud database from cloud_seed_data.json if tables are empty'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reload data even if products already exist',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        product_count = Product.objects.count()

        if product_count > 0 and not force:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Database already contains {product_count} products. Skipping seed to preserve production data."
                )
            )
            return

        fixture_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'cloud_seed_data.json')
        if not os.path.exists(fixture_path):
            fixture_path = 'cloud_seed_data.json'

        try:
            self.stdout.write("Populating database with initial seed data...")
            call_command('loaddata', fixture_path)
            self.stdout.write(self.style.SUCCESS("Initial data loaded successfully!"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Note: Seed command encountered: {e}"))
