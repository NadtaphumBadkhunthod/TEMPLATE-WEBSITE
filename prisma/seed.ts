/**
 * Demo seed. Safe to re-run: it clears content tables first.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const TH = "th";
const EN = "en";

async function main() {
  console.log("Seeding…");

  // --- constraints Prisma's schema language can't express -------------------
  // Table names are mapped to snake_case, column names are not — hence the
  // quoted camelCase identifiers here.
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS project_categories_one_primary
      ON project_categories ("projectId") WHERE "isPrimary";
  `);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS locales_one_default
      ON locales ("isDefault") WHERE "isDefault";
  `);

  // --- wipe (child tables first) -------------------------------------------
  await db.quoteRequestNote.deleteMany();
  await db.quoteRequest.deleteMany();
  await db.formFieldTranslation.deleteMany();
  await db.formField.deleteMany();
  await db.form.deleteMany();
  await db.projectMedia.deleteMany();
  await db.projectCategory.deleteMany();
  await db.projectTranslation.deleteMany();
  await db.project.deleteMany();
  await db.categoryTranslation.deleteMany();
  await db.category.deleteMany();
  await db.fieldDefinitionTranslation.deleteMany();
  await db.fieldDefinition.deleteMany();
  await db.pricingPlanTranslation.deleteMany();
  await db.pricingPlan.deleteMany();
  await db.pageTranslation.deleteMany();
  await db.page.deleteMany();
  await db.mediaTranslation.deleteMany();
  await db.mediaAsset.deleteMany();
  await db.auditLog.deleteMany();
  await db.setting.deleteMany();

  // --- locales --------------------------------------------------------------
  await db.locale.upsert({
    where: { code: TH },
    create: {
      code: TH,
      name: "Thai",
      nativeName: "ไทย",
      isDefault: true,
      sortOrder: 0,
    },
    update: { isDefault: true, isActive: true },
  });
  await db.locale.upsert({
    where: { code: EN },
    create: {
      code: EN,
      name: "English",
      nativeName: "English",
      isDefault: false,
      sortOrder: 1,
    },
    update: { isActive: true },
  });

  // --- admin user -----------------------------------------------------------
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "admin1234";

  await db.adminUser.upsert({
    where: { email },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME || "Site Admin",
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
    },
    update: { passwordHash: await bcrypt.hash(password, 12), role: "admin" },
  });

  // --- settings -------------------------------------------------------------
  const settings: Record<string, unknown> = {
    site: {
      name: { th: "เออร์เบินคอร์ โซลูชันส์", en: "UrbanCore Solutions" },
      tagline: {
        th: "ระบบเมืองอัจฉริยะที่ติดตั้งใช้งานได้จริง",
        en: "Smart city systems that actually get deployed",
      },
    },
    hero: {
      title: {
        th: "เปลี่ยนเมืองให้ฉลาดขึ้น ทีละระบบ",
        en: "Make your city smarter, one system at a time",
      },
      subtitle: {
        th: "เราออกแบบ ติดตั้ง และดูแลระบบเมืองอัจฉริยะแบบครบวงจร ตั้งแต่เซ็นเซอร์จนถึงแดชบอร์ด",
        en: "We design, install and maintain end-to-end smart city systems — from the sensors to the dashboard.",
      },
      ctaLabel: { th: "ดูผลงานของเรา", en: "See our work" },
    },
    contact: {
      email: "hello@urbancore.example",
      phone: "+66 2 123 4567",
      address: {
        th: "อาคารพหลโยธินเพลส ชั้น 12 กรุงเทพมหานคร 10400",
        en: "Phahonyothin Place, 12th floor, Bangkok 10400, Thailand",
      },
    },
    modules: { pricing: true, quote: true },
    seo: {
      defaultTitle: {
        th: "ผลงานระบบเมืองอัจฉริยะ",
        en: "Smart City Project Portfolio",
      },
      defaultDescription: {
        th: "รวมผลงานระบบเมืองอัจฉริยะที่เราออกแบบและติดตั้งทั่วประเทศไทย",
        en: "A portfolio of smart city systems we have designed and deployed across Thailand.",
      },
    },
    i18n: { contentFallback: "fallback" },
    quote: { notifyEmails: ["sales@urbancore.example"] },
  };

  for (const [key, value] of Object.entries(settings)) {
    await db.setting.create({ data: { key, value: value as never } });
  }

  // --- categories -----------------------------------------------------------
  const categoryData = [
    {
      slug: "smart-mobility",
      th: { name: "ระบบจราจรและขนส่ง", description: "ระบบบริหารจัดการจราจรและขนส่งสาธารณะ" },
      en: { name: "Smart Mobility", description: "Traffic management and public transport systems" },
    },
    {
      slug: "smart-energy",
      th: { name: "พลังงานอัจฉริยะ", description: "ระบบบริหารจัดการพลังงานและไฟฟ้าส่องสว่าง" },
      en: { name: "Smart Energy", description: "Energy management and public lighting" },
    },
    {
      slug: "environment",
      th: { name: "สิ่งแวดล้อม", description: "ระบบตรวจวัดคุณภาพอากาศและน้ำ" },
      en: { name: "Environment", description: "Air and water quality monitoring" },
    },
    {
      slug: "public-safety",
      th: { name: "ความปลอดภัยสาธารณะ", description: "ระบบกล้องวงจรปิดและแจ้งเตือนเหตุ" },
      en: { name: "Public Safety", description: "CCTV and incident alerting" },
    },
    {
      slug: "data-platform",
      th: { name: "แพลตฟอร์มข้อมูล", description: "ศูนย์รวมข้อมูลและแดชบอร์ดสำหรับผู้บริหาร" },
      en: { name: "Data Platform", description: "Central data hubs and executive dashboards" },
    },
  ];

  const categories: Record<string, string> = {};
  for (const [index, entry] of categoryData.entries()) {
    const category = await db.category.create({
      data: {
        sortOrder: index,
        translations: {
          create: [
            {
              locale: TH,
              slug: entry.slug,
              name: entry.th.name,
              description: entry.th.description,
            },
            {
              locale: EN,
              slug: `${entry.slug}-en`,
              name: entry.en.name,
              description: entry.en.description,
            },
          ],
        },
      },
    });
    categories[entry.slug] = category.id;
  }

  // --- custom field definitions --------------------------------------------
  const coverage = await db.fieldDefinition.create({
    data: {
      entity: "project",
      key: "coverage_area",
      dataType: "text",
      isTranslatable: true,
      showOnDetail: true,
      sortOrder: 0,
      options: {},
      translations: {
        create: [
          { locale: TH, label: "พื้นที่ให้บริการ" },
          { locale: EN, label: "Coverage area" },
        ],
      },
    },
  });

  await db.fieldDefinition.create({
    data: {
      entity: "project",
      key: "connectivity",
      dataType: "select",
      isTranslatable: false,
      showOnDetail: true,
      sortOrder: 1,
      options: {
        choices: [{ value: "lora" }, { value: "nbiot" }, { value: "fiber" }],
      },
      translations: {
        create: [
          {
            locale: TH,
            label: "การเชื่อมต่อ",
            choiceLabels: { lora: "LoRaWAN", nbiot: "NB-IoT", fiber: "ไฟเบอร์" },
          },
          {
            locale: EN,
            label: "Connectivity",
            choiceLabels: { lora: "LoRaWAN", nbiot: "NB-IoT", fiber: "Fibre" },
          },
        ],
      },
    },
  });

  await db.fieldDefinition.create({
    data: {
      entity: "project",
      key: "deployed_year",
      dataType: "number",
      isTranslatable: false,
      showOnDetail: true,
      sortOrder: 2,
      options: {},
      translations: {
        create: [
          { locale: TH, label: "ปีที่ติดตั้ง" },
          { locale: EN, label: "Year deployed" },
        ],
      },
    },
  });

  console.log(`  field definitions ready (${coverage.key}, connectivity, deployed_year)`);

  // --- projects -------------------------------------------------------------
  type ProjectSeed = {
    slugTh: string;
    slugEn: string;
    categories: string[];
    featured?: boolean;
    price: {
      mode: "hidden" | "exact" | "from" | "range" | "on_request";
      amount?: number;
      max?: number;
    };
    custom: Record<string, unknown>;
    th: { title: string; summary: string; body: string[]; features: string[]; coverage: string };
    en: { title: string; summary: string; body: string[]; features: string[]; coverage: string };
  };

  const projectSeeds: ProjectSeed[] = [
    {
      slugTh: "ระบบไฟถนนอัจฉริยะเทศบาลนครขอนแก่น",
      slugEn: "khon-kaen-smart-street-lighting",
      categories: ["smart-energy", "public-safety"],
      featured: true,
      price: { mode: "from", amount: 2450000 },
      custom: { connectivity: "lora", deployed_year: 2023 },
      th: {
        title: "ระบบไฟถนนอัจฉริยะ เทศบาลนครขอนแก่น",
        summary:
          "เปลี่ยนโคมไฟถนน 4,200 จุดเป็นระบบ LED ควบคุมระยะไกล ลดค่าไฟได้ 62% ภายในปีแรก",
        body: [
          "โครงการนี้ครอบคลุมการเปลี่ยนโคมไฟถนนเดิมทั้งหมด 4,200 จุดในเขตเทศบาลนครขอนแก่น ให้เป็นโคม LED พร้อมโมดูลควบคุมแบบไร้สายบนเครือข่าย LoRaWAN",
          "ระบบสามารถหรี่ไฟตามช่วงเวลาและปริมาณการสัญจรจริง แจ้งเตือนอัตโนมัติเมื่อโคมดับ และรายงานการใช้พลังงานรายจุดแบบเรียลไทม์ผ่านแดชบอร์ดกลาง",
        ],
        features: [
          "ควบคุมและหรี่ไฟรายจุดจากศูนย์กลาง",
          "แจ้งเตือนโคมเสียอัตโนมัติภายใน 15 นาที",
          "ลดการใช้พลังงานลง 62% เทียบกับระบบเดิม",
          "รองรับการขยายเพิ่มได้ถึง 20,000 จุด",
        ],
        coverage: "เขตเทศบาลนครขอนแก่น 46 ตร.กม.",
      },
      en: {
        title: "Smart Street Lighting — Khon Kaen Municipality",
        summary:
          "4,200 street lights converted to remotely managed LED, cutting energy cost by 62% in the first year.",
        body: [
          "The project replaced all 4,200 existing street lights across Khon Kaen municipality with LED luminaires fitted with wireless control modules on a LoRaWAN network.",
          "The system dims lights by schedule and by measured traffic, raises automatic alerts when a luminaire fails, and reports per-pole energy use in real time through a central dashboard.",
        ],
        features: [
          "Per-pole remote control and dimming",
          "Automatic fault alerts within 15 minutes",
          "62% lower energy use than the previous system",
          "Scales to 20,000 connected poles",
        ],
        coverage: "46 km² across Khon Kaen municipality",
      },
    },
    {
      slugTh: "ศูนย์ควบคุมจราจรอัจฉริยะภูเก็ต",
      slugEn: "phuket-traffic-control-centre",
      categories: ["smart-mobility", "data-platform"],
      featured: true,
      price: { mode: "on_request" },
      custom: { connectivity: "fiber", deployed_year: 2024 },
      th: {
        title: "ศูนย์ควบคุมจราจรอัจฉริยะ จังหวัดภูเก็ต",
        summary:
          "ระบบวิเคราะห์ภาพจากกล้อง 180 ตัว ปรับสัญญาณไฟจราจรอัตโนมัติตามปริมาณรถจริง",
        body: [
          "ศูนย์ควบคุมกลางรวบรวมภาพจากกล้อง 180 ตัวบนถนนสายหลัก และใช้การวิเคราะห์ภาพเพื่อนับปริมาณรถแยกตามประเภทและทิศทาง",
          "ระบบปรับรอบสัญญาณไฟจราจรใน 42 ทางแยกแบบอัตโนมัติ และส่งข้อมูลสภาพจราจรให้ประชาชนผ่านป้ายอัจฉริยะและแอปพลิเคชัน",
        ],
        features: [
          "วิเคราะห์ปริมาณจราจรแบบเรียลไทม์จากกล้อง 180 ตัว",
          "ปรับสัญญาณไฟอัตโนมัติ 42 ทางแยก",
          "ลดเวลาเดินทางเฉลี่ยชั่วโมงเร่งด่วน 18%",
          "เชื่อมต่อป้ายแสดงผลอัจฉริยะ 24 จุด",
        ],
        coverage: "ถนนสายหลัก 42 ทางแยกในเขตเมืองภูเก็ต",
      },
      en: {
        title: "Intelligent Traffic Control Centre — Phuket",
        summary:
          "Video analytics across 180 cameras, automatically retiming signals at 42 junctions from live demand.",
        body: [
          "A central control room aggregates video from 180 cameras on the main road network and applies video analytics to count vehicles by class and direction.",
          "The system retimes signals at 42 junctions automatically and publishes live traffic conditions to variable message signs and a public app.",
        ],
        features: [
          "Real-time traffic analytics from 180 cameras",
          "Automatic signal retiming at 42 junctions",
          "18% lower average peak-hour journey time",
          "Feeds 24 variable message signs",
        ],
        coverage: "42 junctions across central Phuket",
      },
    },
    {
      slugTh: "เครือข่ายตรวจวัดคุณภาพอากาศเชียงใหม่",
      slugEn: "chiang-mai-air-quality-network",
      categories: ["environment", "data-platform"],
      featured: true,
      price: { mode: "range", amount: 850000, max: 3200000 },
      custom: { connectivity: "nbiot", deployed_year: 2022 },
      th: {
        title: "เครือข่ายตรวจวัดคุณภาพอากาศ จังหวัดเชียงใหม่",
        summary:
          "สถานีตรวจวัด PM2.5 จำนวน 96 จุด รายงานผลทุก 5 นาที พร้อมระบบพยากรณ์ล่วงหน้า 48 ชั่วโมง",
        body: [
          "เครือข่ายสถานีตรวจวัดขนาดเล็ก 96 จุดกระจายทั่วจังหวัด วัดค่า PM2.5 PM10 อุณหภูมิ และความชื้น ส่งข้อมูลผ่านเครือข่าย NB-IoT",
          "ข้อมูลถูกสอบเทียบกับสถานีมาตรฐานของกรมควบคุมมลพิษ และนำไปใช้ในแบบจำลองพยากรณ์คุณภาพอากาศล่วงหน้า 48 ชั่วโมง เพื่อแจ้งเตือนประชาชนล่วงหน้า",
        ],
        features: [
          "ตรวจวัด PM2.5 และ PM10 ทุก 5 นาที",
          "สอบเทียบกับสถานีมาตรฐานอัตโนมัติ",
          "พยากรณ์ล่วงหน้า 48 ชั่วโมง",
          "เปิด API สาธารณะให้นักพัฒนาใช้งานฟรี",
        ],
        coverage: "96 จุดทั่วจังหวัดเชียงใหม่",
      },
      en: {
        title: "Air Quality Monitoring Network — Chiang Mai",
        summary:
          "96 PM2.5 monitoring stations reporting every 5 minutes, with a 48-hour forecast model.",
        body: [
          "A network of 96 low-cost monitoring stations across the province measures PM2.5, PM10, temperature and humidity, reporting over NB-IoT.",
          "Readings are automatically calibrated against Pollution Control Department reference stations and feed a 48-hour air quality forecast used for early public warnings.",
        ],
        features: [
          "PM2.5 and PM10 readings every 5 minutes",
          "Automatic calibration against reference stations",
          "48-hour forecasting model",
          "Free public API for developers",
        ],
        coverage: "96 sites across Chiang Mai province",
      },
    },
    {
      slugTh: "ระบบบริหารจัดการขยะอัจฉริยะระยอง",
      slugEn: "rayong-smart-waste-management",
      categories: ["environment", "smart-mobility"],
      price: { mode: "exact", amount: 1780000 },
      custom: { connectivity: "lora", deployed_year: 2023 },
      th: {
        title: "ระบบบริหารจัดการขยะอัจฉริยะ เทศบาลเมืองระยอง",
        summary:
          "เซ็นเซอร์วัดระดับขยะในถัง 620 จุด จัดเส้นทางเก็บขยะอัตโนมัติ ลดระยะทางวิ่งรถ 31%",
        body: [
          "ติดตั้งเซ็นเซอร์วัดระดับขยะแบบอัลตราโซนิกในถังขยะสาธารณะ 620 จุด ส่งข้อมูลระดับความเต็มวันละ 4 ครั้ง",
          "ระบบวางแผนเส้นทางเก็บขยะรายวันโดยเลือกเฉพาะจุดที่เต็มเกิน 70% ทำให้ลดระยะทางวิ่งรถเก็บขยะลง 31% และลดการร้องเรียนเรื่องขยะล้นถังลง 74%",
        ],
        features: [
          "เซ็นเซอร์วัดระดับขยะ 620 จุด",
          "จัดเส้นทางเก็บขยะอัตโนมัติรายวัน",
          "ลดระยะทางวิ่งรถ 31%",
          "แอปสำหรับพนักงานเก็บขยะพร้อมนำทาง",
        ],
        coverage: "เขตเทศบาลเมืองระยอง 620 จุดจัดเก็บ",
      },
      en: {
        title: "Smart Waste Management — Rayong Municipality",
        summary:
          "620 bin-level sensors driving daily route optimisation, cutting collection mileage by 31%.",
        body: [
          "Ultrasonic fill-level sensors were installed in 620 public bins, reporting fill level four times a day.",
          "The platform plans each day's collection route from bins above 70% full, reducing vehicle mileage by 31% and overflow complaints by 74%.",
        ],
        features: [
          "620 bin fill-level sensors",
          "Automatic daily route planning",
          "31% less collection mileage",
          "Driver app with turn-by-turn routing",
        ],
        coverage: "620 collection points across Rayong municipality",
      },
    },
    {
      slugTh: "แพลตฟอร์มข้อมูลเมืองกลาง",
      slugEn: "central-city-data-platform",
      categories: ["data-platform"],
      price: { mode: "hidden" },
      custom: { connectivity: "fiber", deployed_year: 2024 },
      th: {
        title: "แพลตฟอร์มข้อมูลเมืองกลาง (City Data Hub)",
        summary:
          "ศูนย์รวมข้อมูลจาก 14 ระบบย่อย พร้อมแดชบอร์ดสำหรับผู้บริหารและ API สำหรับหน่วยงาน",
        body: [
          "แพลตฟอร์มกลางที่รวบรวมข้อมูลจากระบบย่อย 14 ระบบ ทั้งจราจร พลังงาน สิ่งแวดล้อม และความปลอดภัย เข้าสู่คลังข้อมูลเดียว",
          "ผู้บริหารสามารถดูภาพรวมเมืองผ่านแดชบอร์ดเดียว ขณะที่หน่วยงานย่อยเข้าถึงข้อมูลผ่าน API ที่ควบคุมสิทธิ์รายระดับ",
        ],
        features: [
          "รวมข้อมูลจาก 14 ระบบย่อยแบบเรียลไทม์",
          "แดชบอร์ดผู้บริหารปรับแต่งได้เอง",
          "API พร้อมการควบคุมสิทธิ์รายหน่วยงาน",
          "เก็บข้อมูลย้อนหลัง 10 ปีเพื่อการวิเคราะห์",
        ],
        coverage: "ใช้งานร่วมกัน 14 หน่วยงานในสังกัด",
      },
      en: {
        title: "Central City Data Platform",
        summary:
          "A single hub consolidating 14 subsystems, with executive dashboards and a governed API.",
        body: [
          "A central platform that consolidates data from 14 subsystems — traffic, energy, environment and safety — into one warehouse.",
          "Executives get a single city-wide dashboard, while individual departments access the data through an API with per-department access control.",
        ],
        features: [
          "Real-time ingestion from 14 subsystems",
          "Configurable executive dashboards",
          "Governed API with per-department permissions",
          "10 years of history retained for analysis",
        ],
        coverage: "Shared across 14 municipal departments",
      },
    },
    {
      slugTh: "ระบบกล้องวงจรปิดอัจฉริยะเทศบาลนครหาดใหญ่",
      slugEn: "hat-yai-intelligent-cctv",
      categories: ["public-safety"],
      price: { mode: "from", amount: 3600000 },
      custom: { connectivity: "fiber", deployed_year: 2022 },
      th: {
        title: "ระบบกล้องวงจรปิดอัจฉริยะ เทศบาลนครหาดใหญ่",
        summary:
          "กล้อง 340 ตัวพร้อมการวิเคราะห์เหตุการณ์อัตโนมัติ เชื่อมต่อศูนย์สั่งการและสถานีตำรวจ",
        body: [
          "ติดตั้งกล้องความละเอียดสูง 340 ตัวครอบคลุมพื้นที่เศรษฐกิจและจุดเสี่ยง เชื่อมต่อผ่านโครงข่ายไฟเบอร์เฉพาะ",
          "ระบบวิเคราะห์เหตุการณ์อัตโนมัติ เช่น การรวมกลุ่มผิดปกติ วัตถุต้องสงสัย และการเข้าพื้นที่หวงห้าม พร้อมแจ้งเตือนไปยังศูนย์สั่งการภายใน 8 วินาที",
        ],
        features: [
          "กล้องความละเอียดสูง 340 ตัว",
          "แจ้งเตือนเหตุการณ์ผิดปกติภายใน 8 วินาที",
          "เชื่อมต่อศูนย์สั่งการและสถานีตำรวจ 6 แห่ง",
          "เก็บภาพย้อนหลัง 90 วันตามระเบียบราชการ",
        ],
        coverage: "พื้นที่เศรษฐกิจเทศบาลนครหาดใหญ่",
      },
      en: {
        title: "Intelligent CCTV — Hat Yai Municipality",
        summary:
          "340 cameras with automated incident analytics, wired into the command centre and six police stations.",
        body: [
          "340 high-definition cameras were installed across the commercial district and identified risk locations, connected over a dedicated fibre network.",
          "Automated analytics flag unusual crowding, abandoned objects and restricted-area entry, alerting the command centre within eight seconds.",
        ],
        features: [
          "340 high-definition cameras",
          "Incident alerts within 8 seconds",
          "Integrated with 6 police stations",
          "90-day retention per government policy",
        ],
        coverage: "Hat Yai municipal commercial district",
      },
    },
  ];

  for (const [index, seed] of projectSeeds.entries()) {
    const project = await db.project.create({
      data: {
        status: "published",
        isFeatured: seed.featured ?? false,
        sortOrder: index,
        publishedAt: new Date(Date.now() - index * 86400000 * 12),
        priceDisplayMode: seed.price.mode,
        priceAmount: seed.price.amount ?? null,
        priceAmountMax: seed.price.max ?? null,
        priceCurrency: seed.price.mode === "hidden" ? null : "THB",
        custom: seed.custom as never,
        translations: {
          create: [
            {
              locale: TH,
              slug: seed.slugTh,
              title: seed.th.title,
              summary: seed.th.summary,
              body: seed.th.body.map((text) => ({
                type: "paragraph",
                text,
              })) as never,
              features: seed.th.features.map((text) => ({ text })) as never,
              custom: { coverage_area: seed.th.coverage } as never,
              isPublished: true,
            },
            {
              locale: EN,
              slug: seed.slugEn,
              title: seed.en.title,
              summary: seed.en.summary,
              body: seed.en.body.map((text) => ({
                type: "paragraph",
                text,
              })) as never,
              features: seed.en.features.map((text) => ({ text })) as never,
              custom: { coverage_area: seed.en.coverage } as never,
              isPublished: true,
            },
          ],
        },
        categories: {
          create: seed.categories.map((slug, i) => ({
            categoryId: categories[slug],
            isPrimary: i === 0,
            sortOrder: i,
          })),
        },
      },
    });
    console.log(`  project: ${project.id} — ${seed.en.title}`);
  }

  // --- pricing plans --------------------------------------------------------
  const plans = [
    {
      amount: 180000,
      period: "one_time",
      featured: false,
      th: {
        name: "สำรวจและออกแบบ",
        tagline: "เหมาะสำหรับหน่วยงานที่เพิ่งเริ่มต้น",
        features: [
          "สำรวจพื้นที่และประเมินความพร้อม",
          "ออกแบบสถาปัตยกรรมระบบ",
          "ประมาณการงบประมาณโครงการ",
          "-การติดตั้งหน้างาน",
        ],
        cta: "ปรึกษาเรา",
      },
      en: {
        name: "Survey & Design",
        tagline: "For teams still scoping the problem",
        features: [
          "Site survey and readiness assessment",
          "System architecture design",
          "Project budget estimate",
          "-On-site installation",
        ],
        cta: "Talk to us",
      },
    },
    {
      amount: 1250000,
      period: "one_time",
      featured: true,
      th: {
        name: "ติดตั้งระบบนำร่อง",
        tagline: "พิสูจน์ผลลัพธ์จริงก่อนขยายเต็มพื้นที่",
        features: [
          "ทุกอย่างในแพ็กเกจสำรวจและออกแบบ",
          "ติดตั้งอุปกรณ์นำร่องสูงสุด 50 จุด",
          "แดชบอร์ดและรายงานผล 6 เดือน",
          "อบรมเจ้าหน้าที่ 2 ครั้ง",
        ],
        cta: "ขอใบเสนอราคา",
      },
      en: {
        name: "Pilot Deployment",
        tagline: "Prove the outcome before scaling up",
        features: [
          "Everything in Survey & Design",
          "Up to 50 pilot devices installed",
          "Dashboard and 6 months of reporting",
          "Two staff training sessions",
        ],
        cta: "Request a quote",
      },
    },
    {
      amount: null,
      period: null,
      featured: false,
      th: {
        name: "ติดตั้งเต็มพื้นที่",
        tagline: "สำหรับโครงการระดับเมือง",
        features: [
          "ออกแบบเฉพาะตามขนาดพื้นที่",
          "ติดตั้งและเชื่อมต่อระบบเดิม",
          "สัญญาดูแลรักษา 3–5 ปี",
          "SLA ตอบสนองภายใน 4 ชั่วโมง",
        ],
        cta: "ติดต่อฝ่ายขาย",
      },
      en: {
        name: "Full Rollout",
        tagline: "For city-scale programmes",
        features: [
          "Design scaled to your footprint",
          "Installation and legacy integration",
          "3–5 year maintenance contract",
          "4-hour response SLA",
        ],
        cta: "Contact sales",
      },
    },
  ];

  for (const [index, plan] of plans.entries()) {
    await db.pricingPlan.create({
      data: {
        priceDisplayMode: plan.amount === null ? "on_request" : "from",
        priceAmount: plan.amount,
        priceCurrency: plan.amount === null ? null : "THB",
        billingPeriod: plan.period,
        isFeatured: plan.featured,
        sortOrder: index,
        translations: {
          create: [
            {
              locale: TH,
              name: plan.th.name,
              tagline: plan.th.tagline,
              ctaLabel: plan.th.cta,
              features: plan.th.features.map((line) =>
                line.startsWith("-")
                  ? { text: line.slice(1), included: false }
                  : { text: line, included: true },
              ) as never,
            },
            {
              locale: EN,
              name: plan.en.name,
              tagline: plan.en.tagline,
              ctaLabel: plan.en.cta,
              features: plan.en.features.map((line) =>
                line.startsWith("-")
                  ? { text: line.slice(1), included: false }
                  : { text: line, included: true },
              ) as never,
            },
          ],
        },
      },
    });
  }

  // --- quote request form ---------------------------------------------------
  const form = await db.form.create({
    data: {
      key: "quote_request",
      notifyEmails: ["sales@urbancore.example"] as never,
    },
  });

  type FormFieldSeed = {
    key: string;
    type: "text" | "email" | "tel" | "select" | "textarea" | "consent";
    column: string | null;
    required: boolean;
    width: string;
    choices?: string[];
    th: { label: string; placeholder: string; choiceLabels?: Record<string, string> };
    en: { label: string; placeholder: string; choiceLabels?: Record<string, string> };
  };

  const formFields: FormFieldSeed[] = [
    {
      key: "name",
      type: "text" as const,
      column: "name",
      required: true,
      width: "half",
      th: { label: "ชื่อ-นามสกุล", placeholder: "สมชาย ใจดี" },
      en: { label: "Full name", placeholder: "Jane Smith" },
    },
    {
      key: "organisation",
      type: "text" as const,
      column: null,
      required: false,
      width: "half",
      th: { label: "หน่วยงาน / บริษัท", placeholder: "เทศบาลนคร…" },
      en: { label: "Organisation", placeholder: "City of…" },
    },
    {
      key: "email",
      type: "email" as const,
      column: "email",
      required: true,
      width: "half",
      th: { label: "อีเมล", placeholder: "you@example.com" },
      en: { label: "Email", placeholder: "you@example.com" },
    },
    {
      key: "phone",
      type: "tel" as const,
      column: "phone",
      required: true,
      width: "half",
      th: { label: "เบอร์โทรศัพท์", placeholder: "081 234 5678" },
      en: { label: "Phone", placeholder: "+66 81 234 5678" },
    },
    {
      key: "budget_range",
      type: "select" as const,
      column: null,
      required: false,
      width: "full",
      choices: ["under_1m", "1m_5m", "5m_20m", "over_20m"],
      th: {
        label: "งบประมาณโดยประมาณ",
        placeholder: "",
        choiceLabels: {
          under_1m: "ต่ำกว่า 1 ล้านบาท",
          "1m_5m": "1–5 ล้านบาท",
          "5m_20m": "5–20 ล้านบาท",
          over_20m: "มากกว่า 20 ล้านบาท",
        },
      },
      en: {
        label: "Approximate budget",
        placeholder: "",
        choiceLabels: {
          under_1m: "Under ฿1M",
          "1m_5m": "฿1M – ฿5M",
          "5m_20m": "฿5M – ฿20M",
          over_20m: "Over ฿20M",
        },
      },
    },
    {
      key: "message",
      type: "textarea" as const,
      column: "message",
      required: true,
      width: "full",
      th: { label: "รายละเอียดโครงการ", placeholder: "เล่าให้เราฟังคร่าว ๆ…" },
      en: { label: "Project details", placeholder: "Tell us roughly what you need…" },
    },
    {
      key: "consent",
      type: "consent" as const,
      column: null,
      required: true,
      width: "full",
      th: {
        label: "ความยินยอม",
        placeholder:
          "ข้าพเจ้ายินยอมให้เก็บและใช้ข้อมูลนี้เพื่อติดต่อกลับตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล",
      },
      en: {
        label: "Consent",
        placeholder:
          "I consent to my details being stored and used to respond to this enquiry (PDPA).",
      },
    },
  ];

  for (const [index, field] of formFields.entries()) {
    await db.formField.create({
      data: {
        formId: form.id,
        key: field.key,
        fieldType: field.type,
        mapsToColumn: field.column,
        isRequired: field.required,
        width: field.width,
        sortOrder: index,
        options: field.choices
          ? ({ choices: field.choices.map((value) => ({ value })) } as never)
          : ({} as never),
        translations: {
          create: [
            {
              locale: TH,
              label: field.th.label,
              placeholder: field.th.placeholder,
              choiceLabels: (field.th.choiceLabels ?? {}) as never,
            },
            {
              locale: EN,
              label: field.en.label,
              placeholder: field.en.placeholder,
              choiceLabels: (field.en.choiceLabels ?? {}) as never,
            },
          ],
        },
      },
    });
  }

  // --- a couple of sample enquiries -----------------------------------------
  const firstProject = await db.projectTranslation.findFirst({
    where: { locale: EN },
    select: { projectId: true },
  });

  await db.quoteRequest.create({
    data: {
      formId: form.id,
      projectId: firstProject?.projectId ?? null,
      locale: TH,
      name: "สมชาย ใจดี",
      email: "somchai@example.go.th",
      phone: "081 234 5678",
      message:
        "สนใจติดตั้งระบบไฟถนนอัจฉริยะในเขตเทศบาล ประมาณ 800 จุด ขอทราบงบประมาณเบื้องต้นครับ",
      data: { organisation: "เทศบาลตำบลบางแสน", budget_range: "5m_20m" } as never,
      fieldSnapshot: [
        { key: "name", label: "ชื่อ-นามสกุล", type: "text", value: "สมชาย ใจดี" },
        {
          key: "organisation",
          label: "หน่วยงาน / บริษัท",
          type: "text",
          value: "เทศบาลตำบลบางแสน",
        },
        { key: "email", label: "อีเมล", type: "email", value: "somchai@example.go.th" },
        { key: "phone", label: "เบอร์โทรศัพท์", type: "tel", value: "081 234 5678" },
        {
          key: "budget_range",
          label: "งบประมาณโดยประมาณ",
          type: "select",
          value: "5m_20m",
        },
        {
          key: "message",
          label: "รายละเอียดโครงการ",
          type: "textarea",
          value:
            "สนใจติดตั้งระบบไฟถนนอัจฉริยะในเขตเทศบาล ประมาณ 800 จุด ขอทราบงบประมาณเบื้องต้นครับ",
        },
        { key: "consent", label: "ความยินยอม", type: "consent", value: true },
      ] as never,
    },
  });

  await db.quoteRequest.create({
    data: {
      formId: form.id,
      locale: EN,
      status: "in_progress",
      name: "Priya Raman",
      email: "p.raman@example.com",
      phone: "+65 8123 4567",
      message:
        "We are evaluating air quality monitoring for a 30 km² industrial estate. Could you share reference cases?",
      data: { organisation: "Jurong Estate Authority", budget_range: "1m_5m" } as never,
      fieldSnapshot: [
        { key: "name", label: "Full name", type: "text", value: "Priya Raman" },
        {
          key: "organisation",
          label: "Organisation",
          type: "text",
          value: "Jurong Estate Authority",
        },
        { key: "email", label: "Email", type: "email", value: "p.raman@example.com" },
        { key: "phone", label: "Phone", type: "tel", value: "+65 8123 4567" },
        { key: "budget_range", label: "Approximate budget", type: "select", value: "1m_5m" },
        {
          key: "message",
          label: "Project details",
          type: "textarea",
          value:
            "We are evaluating air quality monitoring for a 30 km² industrial estate. Could you share reference cases?",
        },
        { key: "consent", label: "Consent", type: "consent", value: true },
      ] as never,
    },
  });

  console.log(`\nDone.`);
  console.log(`  Admin login: ${email} / ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
