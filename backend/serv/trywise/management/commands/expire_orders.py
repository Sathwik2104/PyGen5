from django.core.management.base import BaseCommand
from trywise.views import expire_overdue_orders

class Command(BaseCommand):
    help = "Checks for overdue 'Ready for Pickup' in-store trial requests, cancels them, restocks items, and emails customers."

    def handle(self, *args, **options):
        self.stdout.write("Checking for overdue trial requests...")
        expire_overdue_orders()
        self.stdout.write(self.style.SUCCESS("Successfully processed trial request expirations."))
