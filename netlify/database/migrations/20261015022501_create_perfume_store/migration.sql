CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"old_price" integer,
	"description" text DEFAULT '' NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'Unisex' NOT NULL,
	"fragrance" text DEFAULT '' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"featured" integer DEFAULT 0 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL
);

--> statement-breakpoint
INSERT INTO settings (key,value) VALUES
('store_name','Journals Perfumes'),('tagline','Tu historia tiene un aroma'),('currency','COP'),
('whatsapp',''),('whatsapp_link',''),('phone',''),('email',''),('instagram',''),('facebook',''),('tiktok',''),('address',''),('hours','')
ON CONFLICT (key) DO NOTHING;
--> statement-breakpoint
INSERT INTO products (name,brand,price,old_price,description,size,category,fragrance,stock,featured) VALUES
('Noir Intense','Maison Élégance',189000,219000,'Una fragancia intensa con carácter amaderado y notas cálidas.','100 ml','Hombre','Amaderada',8,1),
('Rose Élixir','Journals Collection',159000,NULL,'Una composición floral elegante, suave y memorable.','80 ml','Mujer','Floral',10,1),
('Oud Signature','Oriental Luxe',225000,NULL,'Aroma profundo con acordes orientales y especiados.','100 ml','Unisex','Oriental',5,1);
