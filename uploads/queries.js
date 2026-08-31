/* =============================================================
   คลังคำสั่ง SQL สำหรับ QGIS Virtual Layer — ระบบประปา
   ไฟล์นี้เก็บ "ข้อมูล" อย่างเดียว แก้ที่นี่ที่เดียวเมื่อต้องการ
   เพิ่ม ลบ หรือแก้คำสั่ง ไม่ต้องแตะ index.html

   วิธีเพิ่มคำสั่งใหม่ — ต่อท้ายรายการ CATALOG ด้านล่างในรูปแบบนี้

   {req:['PIPE','DMA'],
    n:'ชื่อคำสั่งที่แสดงใน dropdown',
    a:'คำอธิบายหนึ่งบรรทัดใต้ช่องเลือก',
    note:'หมายเหตุที่ขึ้นใต้กล่อง SQL เช่น ใช้คอลัมน์อะไร ปรับตัวเลขไหนได้',
    sql:`SELECT ...
FROM PIPE AS p`},

   กติกาสำคัญ
   - req  = ชั้นข้อมูลที่คำสั่งนี้ต้องใช้ ผู้ใช้ต้องกดเลือกครบทุกชั้นคำสั่งจึงจะแสดง
            ชั้นแรกใน req ใช้เป็นหัวข้อกลุ่มใน dropdown
   - sql  = เขียนชื่อตารางด้วยชื่อชั้นข้อมูลสั้น ๆ เช่น PIPE, DMA, VALVE
            ระบบจะแทนเป็นชื่อจริงตามสาขาที่เลือกให้เอง เช่น B5541018_PIPE
            ห้ามพิมพ์รหัสสาขาลงไปเอง
   - sql  ครอบด้วยเครื่องหมาย ` (backtick) จึงขึ้นบรรทัดใหม่ได้ตามปกติ
            ห้ามใช้ backtick ภายในตัวคำสั่ง
   - ไม่ต้องใส่ ; ปิดท้าย เพราะ QGIS Virtual Layer รับทีละคำสั่ง

   หลังแก้ไฟล์นี้ ให้ขยับเลขเวอร์ชันใน index.html บรรทัด
   <script src="queries.js?v=..."> เพื่อไม่ให้เบราว์เซอร์ใช้ของเก่าในแคช
   ============================================================= */

/* ---------- ชั้นข้อมูลที่แสดงเป็นปุ่มเลือก ---------- */
const LAYERS = [
  {k:'BLDG', th:'อาคาร'},
  {k:'DMA', th:'พื้นที่จ่ายน้ำ'},
  {k:'FIREHYDRANT', th:'หัวดับเพลิง'},
  {k:'LEAKPOINT', th:'จุดท่อรั่ว'},
  {k:'METER', th:'มาตรวัดน้ำ'},
  {k:'PIPE', th:'ท่อประปา'},
  {k:'VALVE', th:'ประตูน้ำ'}
];

/* ---------- สาขา: รหัส กับ ชื่อสาขา ---------- */
const BRANCHES = [
  ['5541011','พระพุทธบาท'],['5541012','หนองแค'],['5541013','มวกเหล็ก'],['5541014','บ้านหมอ'],
  ['5541015','ลพบุรี'],['5541016','บ้านหมี่'],['5541017','ชัยบาดาล'],['5541018','สิงห์บุรี'],
  ['5541019','อ่างทอง'],['5541020','วิเศษชัยชาญ'],['5541021','พระนครศรีอยุธยา (พ)'],['5541022','ผักไห่'],
  ['5541023','เสนา'],['5541024','ท่าเรือ'],['5541025','ปทุมธานี (พ)'],['5541026','รังสิต (พ)'],
  ['5541027','นครนายก'],['5541028','บ้านนา'],['5541029','นครราชสีมา'],['5541030','ปากช่อง'],
  ['5541031','ครบุรี'],['5541032','สีคิ้ว'],['5541033','ปักธงชัย'],['5541034','โชคชัย'],
  ['5541035','พิมาย'],['5541036','ชุมพวง'],['5541037','โนนสูง'],['5541038','ด่านขุนทด'],
  ['5541039','คลองหลวง'],['5541040','ธัญบุรี']
];

/* ---------- ชื่อชั้นข้อมูลที่ใช้ในชื่อตารางจริง เมื่อไม่ตรงกับชื่อย่อบนปุ่ม ---------- */
const TABLE_SUFFIX = {DMA:'DMA_BOUNDARY'};

/* ---------- คลังคำสั่ง ---------- */
const CATALOG = [

/* ---------- PIPE ---------- */
{req:['PIPE'], n:'ความยาวท่อทั้งหมด (ไม่รวมท่อปลอก)',
 a:'จำนวนเส้นและความยาวรวมของท่อทั้งระบบ ตัดท่อปลอกออกแล้ว',
 note:'ท่อปลอกคือ functionId = 6 · ใช้ค่าจากคอลัมน์ length ที่บันทึกไว้ ถ้าอยากวัดจากเส้นจริงบนแผนที่ให้เปลี่ยน sum(p.length) เป็น sum(ST_Length(p.geometry))',
 sql:`SELECT
    count(*) AS pipe_count,
    round(sum(p.length), 2) AS length_m,
    round(sum(p.length) / 1000.0, 3) AS length_km
FROM PIPE AS p
WHERE p.functionId <> 6
    OR p.functionId IS NULL`},

{req:['PIPE','DMA'], n:'ความยาวท่อในแต่ละ DMA',
 a:'ความยาวท่อของแต่ละพื้นที่จ่ายน้ำ โดยปันส่วนท่อที่พาดข้ามโซนตามสัดส่วนที่ตกอยู่ในแต่ละเขต',
 note:'ตัดท่อปลอก functionId = 6 ออกแล้ว · ใช้อัตราส่วนความยาวเส้นในเขตต่อความยาวทั้งเส้น คูณกับค่า length ที่บันทึกไว้ หน่วยผลลัพธ์จึงเป็นเมตรเสมอแม้ชั้นข้อมูลจะเป็นระบบพิกัดแบบองศา · ผลรวมทุกโซนจะเท่ากับความยาวท่อที่อยู่ในเขต DMA ทั้งหมด · DMA ที่ไม่มีท่อจะแสดงค่า 0',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    count(p.geometry) AS pipe_count,
    round(coalesce(sum(p.length * ST_Length(ST_Intersection(p.geometry, d.geometry))
                       / ST_Length(p.geometry)), 0), 2) AS length_share_m
FROM DMA AS d
LEFT JOIN PIPE AS p
    ON ST_Intersects(p.geometry, d.geometry)
    AND p.functionId <> 6
    AND ST_Length(p.geometry) > 0
GROUP BY d.dmaNo, d.dmaName`},

{req:['PIPE'], n:'ความยาวท่อจำแนกตามชนิดและขนาด',
 a:'ตารางสรุปความยาวท่อตามชนิดท่อ (typeId) และขนาดท่อ (sizeId)',
 note:'ตัดท่อปลอกออกแล้ว · sizeId เก็บเป็นตัวเลข จึงเรียงลำดับขนาดได้ถูกต้อง · ถ้าต้องการดูแยกตามชั้นคุณภาพด้วย ให้เพิ่ม p.gradeId ทั้งใน SELECT และ GROUP BY',
 sql:`SELECT
    p.typeId,
    p.sizeId,
    count(*) AS pipe_count,
    round(sum(p.length), 2) AS length_m,
    round(sum(p.length) / 1000.0, 3) AS length_km
FROM PIPE AS p
WHERE p.functionId <> 6
GROUP BY p.typeId, p.sizeId
ORDER BY p.typeId, p.sizeId`},

{req:['PIPE'], n:'ท่ออายุ 10 ปีขึ้นไป มีกี่เส้น ความยาวเท่าใด',
 a:'จำนวนเส้นและความยาวรวมของท่อที่ติดตั้งมาแล้วตั้งแต่ 10 ปีขึ้นไป',
 note:'yearInstall เป็น พ.ศ. คำสั่งจึงแปลงปีปัจจุบันเป็น พ.ศ. ก่อนด้วย strftime + 543 · เปลี่ยนเกณฑ์อายุได้ที่เลข 10 · แถวที่ yearInstall ว่างจะไม่ถูกนับ',
 sql:`SELECT
    count(*) AS pipe_count,
    round(sum(p.length), 2) AS length_m,
    round(sum(p.length) / 1000.0, 3) AS length_km,
    min(p.yearInstall) AS oldest_year,
    max(p.yearInstall) AS newest_year
FROM PIPE AS p
WHERE p.functionId <> 6
    AND p.yearInstall IS NOT NULL
    AND p.yearInstall <= (CAST(strftime('%Y', 'now') AS INTEGER) + 543) - 10`},

{req:['PIPE'], n:'ท่ออายุ 10 ปีขึ้นไป แยกตามปีที่ติดตั้ง',
 a:'กระจายตัวของท่อเก่าในแต่ละปี พร้อมอายุท่อ ใช้จัดลำดับแผนเปลี่ยนท่อ',
 note:'age_year คำนวณจากปีปัจจุบันเป็น พ.ศ. ลบด้วย yearInstall · ถ้าต้องการรวมทุกช่วงอายุให้ลบเงื่อนไขบรรทัดสุดท้ายของ WHERE ออก',
 sql:`SELECT
    p.yearInstall,
    (CAST(strftime('%Y', 'now') AS INTEGER) + 543) - p.yearInstall AS age_year,
    count(*) AS pipe_count,
    round(sum(p.length), 2) AS length_m,
    round(sum(p.length) / 1000.0, 3) AS length_km
FROM PIPE AS p
WHERE p.functionId <> 6
    AND p.yearInstall IS NOT NULL
    AND p.yearInstall <= (CAST(strftime('%Y', 'now') AS INTEGER) + 543) - 10
GROUP BY p.yearInstall
ORDER BY p.yearInstall`},

{req:['PIPE','DMA'], n:'ท่ออายุ 10 ปีขึ้นไป แยกตาม DMA',
 a:'สัดส่วนท่อเก่าในแต่ละพื้นที่จ่ายน้ำ เทียบกับความยาวท่อทั้งหมดของโซนนั้น',
 note:'ค่า old_percent สูงแปลว่าโซนนั้นควรได้รับการเปลี่ยนท่อก่อน · คิดจากคอลัมน์ length ของทั้งเส้น ไม่ได้ตัดตามขอบเขต',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    count(p.geometry) AS pipe_count,
    round(sum(p.length) / 1000.0, 3) AS length_km,
    sum(CASE WHEN p.yearInstall <= (CAST(strftime('%Y', 'now') AS INTEGER) + 543) - 10
             THEN 1 ELSE 0 END) AS old_pipe_count,
    round(sum(CASE WHEN p.yearInstall <= (CAST(strftime('%Y', 'now') AS INTEGER) + 543) - 10
             THEN p.length ELSE 0 END) / 1000.0, 3) AS old_length_km,
    round(sum(CASE WHEN p.yearInstall <= (CAST(strftime('%Y', 'now') AS INTEGER) + 543) - 10
             THEN p.length ELSE 0 END) * 100.0 / sum(p.length), 2) AS old_percent
FROM DMA AS d
JOIN PIPE AS p
    ON ST_Intersects(p.geometry, d.geometry)
    AND p.functionId <> 6
GROUP BY d.dmaNo, d.dmaName
ORDER BY old_percent DESC`},

{req:['PIPE'], n:'สรุปท่อแยกตามหน้าที่การใช้งาน',
 a:'จำนวนและความยาวท่อในแต่ละ functionId ใช้ตรวจว่าท่อปลอกมีสัดส่วนเท่าใด',
 note:'ไม่ตัดท่อปลอกออก เพราะคำสั่งนี้ต้องการเห็นทุกประเภท · functionId = 6 คือท่อปลอก',
 sql:`SELECT
    p.functionId,
    count(*) AS pipe_count,
    round(sum(p.length), 2) AS length_m,
    round(sum(p.length) * 100.0 / (SELECT sum(length) FROM PIPE), 2) AS percent
FROM PIPE AS p
GROUP BY p.functionId
ORDER BY length_m DESC`},

{req:['PIPE'], n:'ความยาวท่อแยกตามโครงการที่วาง',
 a:'สรุปความยาวท่อของแต่ละโครงการ พร้อมปีที่ติดตั้ง',
 note:'ใช้คอลัมน์ projectNo และ projectName · โครงการที่ไม่มีเลขที่จะรวมอยู่ในกลุ่มค่าว่าง',
 sql:`SELECT
    p.projectNo,
    p.projectName,
    min(p.yearInstall) AS year_install,
    count(*) AS pipe_count,
    round(sum(p.length) / 1000.0, 3) AS length_km
FROM PIPE AS p
WHERE p.functionId <> 6
GROUP BY p.projectNo, p.projectName
ORDER BY length_km DESC`},

{req:['PIPE','DMA'], n:'ท่อที่อยู่นอกเขต DMA ทุกโซน',
 a:'ท่อประปาที่ไม่พาดผ่านพื้นที่จ่ายน้ำใดเลย',
 note:'ใช้ตรวจท่อที่ยังไม่ได้จัดเข้าโซน หรือขอบเขต DMA ที่ยังไม่ครอบคลุม · ถ้าผลออกมาเยอะผิดปกติให้ตรวจว่าระบบพิกัดของสองชั้นข้อมูลตรงกัน',
 sql:`SELECT p.*
FROM PIPE AS p
WHERE NOT EXISTS (
    SELECT 1
    FROM DMA AS d
    WHERE ST_Intersects(p.geometry, d.geometry)
)`},

{req:['PIPE','LEAKPOINT'], n:'ท่อที่มีจุดรั่วมากที่สุด',
 a:'นับจุดรั่วที่อยู่ในระยะ 5 เมตรของท่อแต่ละเส้น เรียงจากมากไปน้อย',
 note:'ท่อที่ติดอันดับต้นควรพิจารณาเปลี่ยนก่อน · ปรับระยะจับคู่ได้ที่เลข 5 ใน ST_Buffer',
 sql:`SELECT
    p.PIPE_ID,
    p.typeId,
    p.sizeId,
    p.yearInstall,
    p.length AS length_m,
    count(l.geometry) AS leak_count,
    p.geometry
FROM PIPE AS p
JOIN LEAKPOINT AS l
    ON ST_Intersects(l.geometry, ST_Buffer(p.geometry, 5))
WHERE p.functionId <> 6
GROUP BY p.PIPE_ID, p.typeId, p.sizeId, p.yearInstall, p.length, p.geometry
ORDER BY leak_count DESC`},

/* ---------- DMA ---------- */
{req:['DMA'], n:'ขนาดพื้นที่ของแต่ละ DMA',
 a:'พื้นที่เป็นตารางกิโลเมตรและไร่ พร้อมความยาวเส้นรอบรูป',
 note:'ใช้ 1 ไร่ = 1,600 ตารางเมตร · ต้องเป็นระบบพิกัดแบบเมตรเท่านั้น',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    round(ST_Area(d.geometry) / 1000000.0, 4) AS area_sqkm,
    round(ST_Area(d.geometry) / 1600.0, 2) AS area_rai,
    round(ST_Perimeter(d.geometry), 2) AS perimeter_m
FROM DMA AS d
ORDER BY area_sqkm DESC`},

{req:['DMA','PIPE','METER','LEAKPOINT','VALVE'], n:'สรุปภาพรวมของแต่ละ DMA',
 a:'จำนวนผู้ใช้น้ำ จุดรั่ว ประตูน้ำ และความยาวท่อ รวมในตารางเดียว',
 note:'ใช้ subquery แยกต่อชั้นข้อมูล จึงไม่เกิดการนับซ้ำจากการ join หลายตาราง · บนข้อมูลขนาดใหญ่คำสั่งนี้ใช้เวลานานกว่าคำสั่งอื่น',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    (SELECT count(*) FROM METER AS m
        WHERE ST_Intersects(m.geometry, d.geometry)) AS meter_count,
    (SELECT count(*) FROM LEAKPOINT AS l
        WHERE ST_Intersects(l.geometry, d.geometry)) AS leak_count,
    (SELECT count(*) FROM VALVE AS v
        WHERE ST_Intersects(v.geometry, d.geometry)) AS valve_count,
    (SELECT round(sum(p.length * ST_Length(ST_Intersection(p.geometry, d.geometry))
                      / ST_Length(p.geometry)) / 1000.0, 3)
        FROM PIPE AS p
        WHERE ST_Intersects(p.geometry, d.geometry)
            AND p.functionId <> 6
            AND ST_Length(p.geometry) > 0) AS pipe_km,
    d.geometry
FROM DMA AS d
ORDER BY d.dmaNo`},

{req:['DMA','METER','PIPE'], n:'ความหนาแน่นผู้ใช้น้ำต่อความยาวท่อ',
 a:'จำนวนผู้ใช้น้ำต่อท่อ 1 กิโลเมตร ใช้เทียบประสิทธิภาพการใช้โครงข่ายแต่ละโซน',
 note:'ค่ายิ่งต่ำแปลว่าลงทุนท่อไปมากแต่มีผู้ใช้น้ำน้อย · DMA ที่ไม่มีท่อจะได้ค่าว่าง',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    (SELECT count(*) FROM METER AS m
        WHERE ST_Intersects(m.geometry, d.geometry)) AS meter_count,
    (SELECT round(sum(p.length * ST_Length(ST_Intersection(p.geometry, d.geometry))
                      / ST_Length(p.geometry)) / 1000.0, 3)
        FROM PIPE AS p
        WHERE ST_Intersects(p.geometry, d.geometry)
            AND p.functionId <> 6
            AND ST_Length(p.geometry) > 0) AS pipe_km,
    round(
        (SELECT count(*) * 1000.0 FROM METER AS m
            WHERE ST_Intersects(m.geometry, d.geometry)) /
        (SELECT sum(p.length * ST_Length(ST_Intersection(p.geometry, d.geometry))
                    / ST_Length(p.geometry))
            FROM PIPE AS p
            WHERE ST_Intersects(p.geometry, d.geometry)
                AND p.functionId <> 6
                AND ST_Length(p.geometry) > 0), 1) AS meter_per_km
FROM DMA AS d
ORDER BY meter_per_km DESC`},

{req:['DMA','METER'], n:'DMA ที่ยังไม่มีข้อมูลผู้ใช้น้ำ',
 a:'พื้นที่จ่ายน้ำที่ไม่พบมาตรวัดน้ำอยู่ภายในเลย',
 note:'ใช้ตรวจโซนที่ยังไม่ได้นำเข้าข้อมูล หรือขอบเขตที่วาดผิดตำแหน่ง',
 sql:`SELECT d.*
FROM DMA AS d
WHERE NOT EXISTS (
    SELECT 1
    FROM METER AS m
    WHERE ST_Intersects(m.geometry, d.geometry)
)`},

/* ---------- METER ---------- */
{req:['METER','DMA'], n:'นับจำนวนผู้ใช้น้ำในแต่ละ DMA',
 a:'จำนวนมาตรวัดน้ำที่ตกอยู่ในแต่ละพื้นที่จ่ายน้ำ',
 note:'ใช้ LEFT JOIN จาก DMA เพื่อให้โซนที่ยังไม่มีผู้ใช้น้ำแสดงค่า 0 ด้วย',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    count(m.geometry) AS user_count
FROM DMA AS d
LEFT JOIN METER AS m
    ON ST_Intersects(m.geometry, d.geometry)
GROUP BY d.dmaNo, d.dmaName
ORDER BY user_count DESC`},

{req:['METER','DMA'], n:'นับผู้ใช้น้ำแยกตามประเภทในแต่ละ DMA',
 a:'ตารางสรุปสองชั้น: พื้นที่จ่ายน้ำ × ประเภทผู้ใช้น้ำ',
 note:'คอลัมน์ cust_type ยังเป็นค่าสมมติ รอโครงสร้างจริงของชั้น METER',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    m.cust_type,
    count(*) AS user_count
FROM METER AS m
JOIN DMA AS d
    ON ST_Intersects(m.geometry, d.geometry)
GROUP BY d.dmaNo, d.dmaName, m.cust_type
ORDER BY d.dmaNo, user_count DESC`},

{req:['METER','DMA'], n:'ผู้ใช้น้ำที่อยู่นอกเขต DMA ทุกโซน',
 a:'มาตรวัดน้ำที่ไม่ตกอยู่ในพื้นที่จ่ายน้ำใดเลย',
 note:'มักเกิดจากพิกัดที่ลงผิดหรือขอบเขต DMA ที่ยังไม่อัปเดต · ผลลัพธ์เปิดเป็นเลเยอร์เพื่อไล่แก้บนแผนที่ได้',
 sql:`SELECT m.*
FROM METER AS m
WHERE NOT EXISTS (
    SELECT 1
    FROM DMA AS d
    WHERE ST_Intersects(m.geometry, d.geometry)
)`},

{req:['METER','LEAKPOINT'], n:'ผู้ใช้น้ำที่ได้รับผลกระทบจากจุดรั่ว',
 a:'มาตรวัดน้ำที่อยู่ในรัศมี 100 เมตรจากจุดรั่ว ใช้ทำรายชื่อแจ้งเตือนน้ำไม่ไหล',
 note:'ปรับรัศมีได้ที่เลข 100 · ใช้ DISTINCT เพื่อไม่ให้ผู้ใช้น้ำที่อยู่ใกล้จุดรั่วหลายจุดถูกนับซ้ำ',
 sql:`SELECT DISTINCT
    m.*
FROM METER AS m
JOIN LEAKPOINT AS l
    ON ST_Intersects(m.geometry, ST_Buffer(l.geometry, 100))`},

{req:['METER','PIPE'], n:'ผู้ใช้น้ำที่อยู่ห่างจากท่อเกิน 50 เมตร',
 a:'มาตรวัดน้ำที่ไม่มีท่อประปาอยู่ใกล้ ใช้ตรวจข้อมูลท่อที่ยังขาดหรือพิกัดที่ผิด',
 note:'ปรับระยะได้ที่เลข 50 · ตัดท่อปลอกออกจากการเทียบแล้ว',
 sql:`SELECT m.*
FROM METER AS m
WHERE NOT EXISTS (
    SELECT 1
    FROM PIPE AS p
    WHERE ST_Intersects(p.geometry, ST_Buffer(m.geometry, 50))
        AND p.functionId <> 6
)`},

/* ---------- LEAKPOINT ---------- */
{req:['LEAKPOINT','DMA'], n:'นับจำนวนจุดท่อรั่วในแต่ละ DMA',
 a:'จำนวนจุดรั่วที่บันทึกไว้ในแต่ละพื้นที่จ่ายน้ำ',
 note:'ถ้าต้องการดูเฉพาะช่วงเวลา ให้เพิ่มเงื่อนไขวันที่ในบรรทัด ON ของ LEFT JOIN',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    count(l.geometry) AS leak_count
FROM DMA AS d
LEFT JOIN LEAKPOINT AS l
    ON ST_Intersects(l.geometry, d.geometry)
GROUP BY d.dmaNo, d.dmaName
ORDER BY leak_count DESC`},

{req:['LEAKPOINT','DMA','PIPE'], n:'อัตราจุดรั่วต่อความยาวท่อ 1 กม.',
 a:'ดัชนีชี้ DMA ที่ควรเข้าไปสำรวจหาน้ำสูญเสียก่อน',
 note:'ค่าที่ใช้เฝ้าระวังมักอยู่ราว 0.2 ถึง 0.5 จุดต่อกิโลเมตรต่อปี · DMA ที่ไม่มีท่อจะได้ค่าว่าง',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    (SELECT count(*) FROM LEAKPOINT AS l
        WHERE ST_Intersects(l.geometry, d.geometry)) AS leak_count,
    (SELECT round(sum(p.length * ST_Length(ST_Intersection(p.geometry, d.geometry))
                      / ST_Length(p.geometry)) / 1000.0, 3)
        FROM PIPE AS p
        WHERE ST_Intersects(p.geometry, d.geometry)
            AND p.functionId <> 6
            AND ST_Length(p.geometry) > 0) AS pipe_km,
    round(
        (SELECT count(*) * 1000.0 FROM LEAKPOINT AS l
            WHERE ST_Intersects(l.geometry, d.geometry)) /
        (SELECT sum(p.length * ST_Length(ST_Intersection(p.geometry, d.geometry))
                    / ST_Length(p.geometry))
            FROM PIPE AS p
            WHERE ST_Intersects(p.geometry, d.geometry)
                AND p.functionId <> 6
                AND ST_Length(p.geometry) > 0), 3) AS leak_per_km
FROM DMA AS d
ORDER BY leak_per_km DESC`},

{req:['LEAKPOINT','PIPE'], n:'จับคู่จุดรั่วกับท่อที่ใกล้ที่สุด',
 a:'ระบุว่าจุดรั่วแต่ละจุดน่าจะเกิดกับท่อเส้นใด พร้อมชนิด ขนาด และปีที่ติดตั้ง',
 note:'ค่า dist_m ที่สูงผิดปกติแปลว่าจุดรั่วนั้นลงตำแหน่งคลาดเคลื่อน · คำสั่งเทียบกับท่อทุกเส้น จึงช้าบนข้อมูลขนาดใหญ่',
 sql:`SELECT
    l.*,
    (SELECT p.PIPE_ID FROM PIPE AS p WHERE p.functionId <> 6
        ORDER BY ST_Distance(l.geometry, p.geometry) LIMIT 1) AS nearest_pipe,
    (SELECT p.typeId FROM PIPE AS p WHERE p.functionId <> 6
        ORDER BY ST_Distance(l.geometry, p.geometry) LIMIT 1) AS pipe_type,
    (SELECT p.sizeId FROM PIPE AS p WHERE p.functionId <> 6
        ORDER BY ST_Distance(l.geometry, p.geometry) LIMIT 1) AS pipe_size,
    (SELECT p.yearInstall FROM PIPE AS p WHERE p.functionId <> 6
        ORDER BY ST_Distance(l.geometry, p.geometry) LIMIT 1) AS pipe_year,
    (SELECT round(min(ST_Distance(l.geometry, p.geometry)), 2)
        FROM PIPE AS p WHERE p.functionId <> 6) AS dist_m
FROM LEAKPOINT AS l
ORDER BY dist_m DESC`},

{req:['LEAKPOINT','PIPE'], n:'จุดรั่วแยกตามชนิดและขนาดท่อ',
 a:'สรุปว่าท่อชนิดใดขนาดใดเกิดการรั่วบ่อยที่สุด',
 note:'นับจากท่อที่อยู่ในรัศมี 5 เมตรของจุดรั่ว จุดที่อยู่ใกล้ท่อหลายเส้นจะถูกนับให้ทุกเส้น',
 sql:`SELECT
    p.typeId,
    p.sizeId,
    count(*) AS leak_count
FROM LEAKPOINT AS l
JOIN PIPE AS p
    ON ST_Intersects(p.geometry, ST_Buffer(l.geometry, 5))
WHERE p.functionId <> 6
GROUP BY p.typeId, p.sizeId
ORDER BY leak_count DESC`},

{req:['LEAKPOINT'], n:'จุดที่เกิดการรั่วซ้ำในรัศมี 50 เมตร',
 a:'จุดรั่วที่มีการรั่วอื่นอยู่ใกล้เคียง บ่งชี้ช่วงท่อที่ควรเปลี่ยนทั้งเส้น',
 note:'ค่า leaks_nearby นับรวมตัวเองด้วย จึงกรองที่มากกว่า 1 · ปรับรัศมีได้ที่เลข 50',
 sql:`SELECT *
FROM (
    SELECT
        l.*,
        (SELECT count(*) FROM LEAKPOINT AS l2
            WHERE ST_Intersects(l2.geometry, ST_Buffer(l.geometry, 50))) AS leaks_nearby
    FROM LEAKPOINT AS l
)
WHERE leaks_nearby > 1
ORDER BY leaks_nearby DESC`},

/* ---------- VALVE ---------- */
{req:['VALVE'], n:'นับจำนวนประตูน้ำ จำแนกตามประเภทและขนาด',
 a:'จำนวนประตูน้ำทั้งระบบ แยกตามประเภท (typeId) และขนาด (sizeId) พร้อมชื่อประเภทเต็ม',
 note:'แปลงรหัส typeId เป็นชื่อประเภทด้วย CASE · ใช้ CAST เพื่อให้เทียบได้ทั้งกรณีที่คอลัมน์เก็บเป็นตัวเลขและเก็บเป็นข้อความ · รหัสที่ไม่อยู่ในรายการ 1 ถึง 10 จะแสดงว่าไม่ระบุ',
 sql:`SELECT
    v.typeId,
    CASE CAST(v.typeId AS INTEGER)
        WHEN 1 THEN 'ประตูน้ำบนดิน (ลิ้นเกต)'
        WHEN 2 THEN 'ประตูน้ำใต้ดิน (ลิ้นเกต)'
        WHEN 3 THEN 'ประตูน้ำบนดิน (ลูกบอล)'
        WHEN 4 THEN 'ประตูน้ำใต้ดิน (ลิ้นปีกผีเสื้อ)'
        WHEN 5 THEN 'ประตูน้ำกันกลับ (Check Valve)'
        WHEN 6 THEN 'ประตูน้ำระบายอากาศ (Air Valve)'
        WHEN 7 THEN 'ประตูน้ำลดแรงดัน (Reducing Valve)'
        WHEN 8 THEN 'ประตูน้ำระบายตะกอน (Blow off Valve)'
        WHEN 9 THEN 'อื่นๆ'
        WHEN 10 THEN 'ประตูน้ำทองเหลือง'
        ELSE 'ไม่ระบุ'
    END AS type_name,
    v.sizeId,
    count(*) AS valve_count
FROM VALVE AS v
GROUP BY v.typeId, v.sizeId
ORDER BY v.typeId, v.sizeId`},

{req:['VALVE','DMA'], n:'นับจำนวนประตูน้ำแยกตาม DMA',
 a:'จำนวนประตูน้ำที่ติดตั้งในแต่ละพื้นที่จ่ายน้ำ',
 note:'ใช้ LEFT JOIN จาก DMA เพื่อให้โซนที่ยังไม่มีประตูน้ำแสดงค่า 0 ด้วย',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    count(v.geometry) AS valve_count
FROM DMA AS d
LEFT JOIN VALVE AS v
    ON ST_Intersects(v.geometry, d.geometry)
GROUP BY d.dmaNo, d.dmaName
ORDER BY valve_count DESC`},

{req:['VALVE','DMA'], n:'นับจำนวนประตูน้ำแยกตาม DMA จำแนกประเภทและขนาด',
 a:'ตารางสรุปสามชั้น: พื้นที่จ่ายน้ำ × ประเภทประตูน้ำ × ขนาด',
 note:'แปลงรหัส typeId เป็นชื่อประเภทด้วย CASE · ใช้ CAST เพื่อให้เทียบได้ทั้งกรณีที่คอลัมน์เก็บเป็นตัวเลขและเก็บเป็นข้อความ · รหัสที่ไม่อยู่ในรายการ 1 ถึง 10 จะแสดงว่าไม่ระบุ · ประตูน้ำที่อยู่นอกเขต DMA ทุกโซนจะไม่ปรากฏในผลลัพธ์',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    v.typeId,
    CASE CAST(v.typeId AS INTEGER)
        WHEN 1 THEN 'ประตูน้ำบนดิน (ลิ้นเกต)'
        WHEN 2 THEN 'ประตูน้ำใต้ดิน (ลิ้นเกต)'
        WHEN 3 THEN 'ประตูน้ำบนดิน (ลูกบอล)'
        WHEN 4 THEN 'ประตูน้ำใต้ดิน (ลิ้นปีกผีเสื้อ)'
        WHEN 5 THEN 'ประตูน้ำกันกลับ (Check Valve)'
        WHEN 6 THEN 'ประตูน้ำระบายอากาศ (Air Valve)'
        WHEN 7 THEN 'ประตูน้ำลดแรงดัน (Reducing Valve)'
        WHEN 8 THEN 'ประตูน้ำระบายตะกอน (Blow off Valve)'
        WHEN 9 THEN 'อื่นๆ'
        WHEN 10 THEN 'ประตูน้ำทองเหลือง'
        ELSE 'ไม่ระบุ'
    END AS type_name,
    v.sizeId,
    count(*) AS valve_count
FROM VALVE AS v
JOIN DMA AS d
    ON ST_Intersects(v.geometry, d.geometry)
GROUP BY d.dmaNo, d.dmaName, v.typeId, v.sizeId
ORDER BY d.dmaNo, v.typeId, v.sizeId`},

{req:['VALVE','LEAKPOINT'], n:'ประตูน้ำที่ควรปิดเมื่อเกิดจุดรั่ว',
 a:'ประตูน้ำทุกตัวที่อยู่ในระยะ 200 เมตรจากแต่ละจุดรั่ว เรียงตามระยะใกล้สุด',
 note:'เป็นการคัดกรองเบื้องต้นตามระยะทาง ไม่ได้วิเคราะห์ทิศทางการไหลจริง · ปรับรัศมีได้ที่เลข 200 และค่านี้เป็นหน่วยของระบบพิกัด จึงต้องใช้กับข้อมูลที่เป็นเมตร',
 sql:`SELECT
    l.leak_id,
    v.VALVE_ID,
    CASE CAST(v.typeId AS INTEGER)
        WHEN 1 THEN 'ประตูน้ำบนดิน (ลิ้นเกต)'
        WHEN 2 THEN 'ประตูน้ำใต้ดิน (ลิ้นเกต)'
        WHEN 3 THEN 'ประตูน้ำบนดิน (ลูกบอล)'
        WHEN 4 THEN 'ประตูน้ำใต้ดิน (ลิ้นปีกผีเสื้อ)'
        WHEN 5 THEN 'ประตูน้ำกันกลับ (Check Valve)'
        WHEN 6 THEN 'ประตูน้ำระบายอากาศ (Air Valve)'
        WHEN 7 THEN 'ประตูน้ำลดแรงดัน (Reducing Valve)'
        WHEN 8 THEN 'ประตูน้ำระบายตะกอน (Blow off Valve)'
        WHEN 9 THEN 'อื่นๆ'
        WHEN 10 THEN 'ประตูน้ำทองเหลือง'
        ELSE 'ไม่ระบุ'
    END AS type_name,
    v.sizeId,
    round(ST_Distance(l.geometry, v.geometry), 2) AS dist_m,
    v.geometry
FROM LEAKPOINT AS l
JOIN VALVE AS v
    ON ST_Intersects(v.geometry, ST_Buffer(l.geometry, 200))
ORDER BY l.leak_id, dist_m`},

{req:['VALVE','DMA','PIPE'], n:'ความหนาแน่นประตูน้ำต่อความยาวท่อ',
 a:'จำนวนประตูน้ำต่อท่อ 1 กิโลเมตรในแต่ละ DMA',
 note:'ค่าที่ต่ำเกินไปหมายถึงเวลาซ่อมท่อจะต้องปิดน้ำเป็นบริเวณกว้าง · ความยาวท่อคิดแบบปันส่วนตามสัดส่วนที่ตกในเขต หน่วยจึงเป็นเมตรเสมอ',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    (SELECT count(*) FROM VALVE AS v
        WHERE ST_Intersects(v.geometry, d.geometry)) AS valve_count,
    (SELECT round(sum(p.length * ST_Length(ST_Intersection(p.geometry, d.geometry))
                      / ST_Length(p.geometry)) / 1000.0, 3)
        FROM PIPE AS p
        WHERE ST_Intersects(p.geometry, d.geometry)
            AND p.functionId <> 6
            AND ST_Length(p.geometry) > 0) AS pipe_km,
    round(
        (SELECT count(*) * 1000.0 FROM VALVE AS v
            WHERE ST_Intersects(v.geometry, d.geometry)) /
        (SELECT sum(p.length * ST_Length(ST_Intersection(p.geometry, d.geometry))
                    / ST_Length(p.geometry))
            FROM PIPE AS p
            WHERE ST_Intersects(p.geometry, d.geometry)
                AND p.functionId <> 6
                AND ST_Length(p.geometry) > 0), 2) AS valve_per_km
FROM DMA AS d
ORDER BY valve_per_km`},

/* ---------- FIREHYDRANT ---------- */
{req:['FIREHYDRANT','DMA'], n:'นับจำนวนหัวดับเพลิงในแต่ละ DMA',
 a:'จำนวนหัวดับเพลิงที่ติดตั้งในแต่ละพื้นที่จ่ายน้ำ',
 note:'ใช้ LEFT JOIN จาก DMA เพื่อให้โซนที่ยังไม่มีหัวดับเพลิงแสดงค่า 0',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    count(h.geometry) AS hydrant_count
FROM DMA AS d
LEFT JOIN FIREHYDRANT AS h
    ON ST_Intersects(h.geometry, d.geometry)
GROUP BY d.dmaNo, d.dmaName
ORDER BY hydrant_count DESC`},

/* ---------- BLDG ---------- */
{req:['BLDG','DMA'], n:'นับจำนวนอาคารในแต่ละ DMA',
 a:'จำนวนอาคารที่ตกอยู่ในแต่ละพื้นที่จ่ายน้ำ',
 note:'เทียบด้วยจุดศูนย์กลางอาคาร อาคารที่คร่อมเส้นขอบ DMA จึงถูกนับเพียงครั้งเดียว',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    count(b.geometry) AS bldg_count
FROM DMA AS d
LEFT JOIN BLDG AS b
    ON ST_Intersects(ST_Centroid(b.geometry), d.geometry)
GROUP BY d.dmaNo, d.dmaName
ORDER BY bldg_count DESC`},

{req:['BLDG','METER'], n:'อาคารที่ยังไม่มีมาตรวัดน้ำ',
 a:'อาคารที่ไม่พบมาตรวัดน้ำอยู่ภายในหรือในระยะ 10 เมตร',
 note:'ใช้หาผู้ที่ยังไม่เป็นผู้ใช้น้ำในเขตจ่ายน้ำ · ปรับระยะค้นหาได้ที่เลข 10',
 sql:`SELECT b.*
FROM BLDG AS b
WHERE NOT EXISTS (
    SELECT 1
    FROM METER AS m
    WHERE ST_Intersects(m.geometry, ST_Buffer(b.geometry, 10))
)`},

{req:['BLDG','DMA'], n:'ความหนาแน่นอาคารต่อพื้นที่ DMA',
 a:'จำนวนอาคารต่อหนึ่งตารางกิโลเมตรในแต่ละพื้นที่จ่ายน้ำ',
 note:'ค่า area_sqkm คำนวณจากหน่วยของระบบพิกัด ถ้าข้อมูลเป็น EPSG:4326 ตัวเลขจะไม่ใช่ตารางกิโลเมตร',
 sql:`SELECT
    d.dmaNo,
    d.dmaName,
    count(b.geometry) AS bldg_count,
    round(ST_Area(d.geometry) / 1000000.0, 4) AS area_sqkm,
    round(count(b.geometry) / (ST_Area(d.geometry) / 1000000.0), 1) AS bldg_per_sqkm
FROM DMA AS d
LEFT JOIN BLDG AS b
    ON ST_Intersects(ST_Centroid(b.geometry), d.geometry)
GROUP BY d.dmaNo, d.dmaName, d.geometry
ORDER BY bldg_per_sqkm DESC`}
];
