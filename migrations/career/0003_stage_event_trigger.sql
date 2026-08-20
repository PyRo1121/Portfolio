CREATE TRIGGER career_opportunity_stage_event_after_update
AFTER UPDATE OF stage ON career_opportunities
WHEN OLD.stage IS NOT NEW.stage
BEGIN
	INSERT INTO career_stage_events (
		id,
		opportunity_id,
		owner_email,
		from_stage,
		to_stage,
		occurred_at
	)
	VALUES (
		lower(hex(randomblob(4))) || '-' ||
		lower(hex(randomblob(2))) || '-' ||
		'4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
		substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
		lower(hex(randomblob(6))),
		NEW.id,
		NEW.owner_email,
		OLD.stage,
		NEW.stage,
		NEW.updated_at
	);
END;
