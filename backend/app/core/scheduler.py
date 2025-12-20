import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

class SchedulerService:
    _scheduler: AsyncIOScheduler = None

    @classmethod
    def get_scheduler(cls):
        if cls._scheduler is None:
            cls._scheduler = AsyncIOScheduler()
        return cls._scheduler

    @classmethod
    def start(cls):
        scheduler = cls.get_scheduler()
        if not scheduler.running:
            logger.info("Starting background task scheduler...")
            scheduler.start()
        return scheduler

    @classmethod
    def stop(cls):
        if cls._scheduler and cls._scheduler.running:
            logger.info("Stopping background task scheduler...")
            cls._scheduler.shutdown()

    @classmethod
    def add_job(cls, func, trigger, id, replace_existing=True, **kwargs):
        scheduler = cls.get_scheduler()
        scheduler.add_job(
            func,
            trigger=trigger,
            id=id,
            replace_existing=replace_existing,
            **kwargs
        )
        logger.info(f"Added background job: {id}")

