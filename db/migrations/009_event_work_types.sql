-- Types of work offered on the talent-pool form, set by the organisers per event (Event settings).
ALTER TABLE events ADD COLUMN work_types text[] NOT NULL DEFAULT '{}';
