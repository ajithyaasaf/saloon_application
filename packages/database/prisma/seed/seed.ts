import {
  PrismaClient,
  UserRole,
  SalonStatus,
  SalonPlanType,
  BranchGenderCategory,
  StaffRole,
  EmploymentStatus,
  CustomerStatus,
  ProductType,
  UnitType,
  CouponDiscountType,
  CouponStatus,
  CouponApplicabilityType,
  CouponCustomerEligibilityType,
  ReviewStatus,
  Gender,
  ServiceStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

// bcrypt hash of 'Password@123' with 12 rounds
const DEFAULT_PASSWORD_HASH = '$2b$12$xCxSfn0CxcefZnUSMnPf6OrwwsDKDtBpOlGboDXFKnuv5PT3gCVBK';

async function main() {
  console.log('🌴 Seeding Tamil Nadu Salons, Local Services, Staff & Demo Accounts into Neon DB...\n');

  // ==========================================
  // 1. Platform Settings Singleton
  // ==========================================
  await prisma.platformSettings.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      defaultCommissionPercentage: 10.0,
      taxRatePercentage: 18.0,
      bookingBufferMinutes: 10,
      freeCancellationHours: 4,
      minBookingLeadMinutes: 30,
      maxAdvanceBookingDays: 30,
    },
  });
  console.log('✓ Platform settings initialized');

  // ==========================================
  // 2. Super Administrator Account
  // ==========================================
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@saloon.com' },
    update: {
      passwordHash: DEFAULT_PASSWORD_HASH,
      isActive: true,
      role: UserRole.SUPER_ADMIN,
    },
    create: {
      phone: '9840012345',
      phoneVerified: true,
      email: 'superadmin@saloon.com',
      emailVerified: true,
      passwordHash: DEFAULT_PASSWORD_HASH,
      firstName: 'Kannan',
      lastName: 'Rajendran',
      displayName: 'Super Administrator (Kannan)',
      role: UserRole.SUPER_ADMIN,
      gender: Gender.MALE,
      isActive: true,
    },
  });
  console.log(`✓ Super Admin seeded: ${superAdmin.email} (${superAdmin.displayName})`);

  // ==========================================
  // 3. Salon Owners (Tamil Nadu)
  // ==========================================
  const owner1 = await prisma.user.upsert({
    where: { email: 'karthik@naturalsluxe.in' },
    update: { passwordHash: DEFAULT_PASSWORD_HASH, role: UserRole.SALON_OWNER, isActive: true },
    create: {
      phone: '9841022334',
      phoneVerified: true,
      email: 'karthik@naturalsluxe.in',
      emailVerified: true,
      passwordHash: DEFAULT_PASSWORD_HASH,
      firstName: 'Karthik',
      lastName: 'Soundararajan',
      displayName: 'Karthik Soundararajan',
      role: UserRole.SALON_OWNER,
      gender: Gender.MALE,
      isActive: true,
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'priya@limelitestudio.in' },
    update: { passwordHash: DEFAULT_PASSWORD_HASH, role: UserRole.SALON_OWNER, isActive: true },
    create: {
      phone: '9842033445',
      phoneVerified: true,
      email: 'priya@limelitestudio.in',
      emailVerified: true,
      passwordHash: DEFAULT_PASSWORD_HASH,
      firstName: 'Priya',
      lastName: 'Annamalai',
      displayName: 'Priya Annamalai',
      role: UserRole.SALON_OWNER,
      gender: Gender.FEMALE,
      isActive: true,
    },
  });

  const owner3 = await prisma.user.upsert({
    where: { email: 'senthil@greentrends-tn.in' },
    update: { passwordHash: DEFAULT_PASSWORD_HASH, role: UserRole.SALON_OWNER, isActive: true },
    create: {
      phone: '9843044556',
      phoneVerified: true,
      email: 'senthil@greentrends-tn.in',
      emailVerified: true,
      passwordHash: DEFAULT_PASSWORD_HASH,
      firstName: 'Senthil',
      lastName: 'Murugan',
      displayName: 'Senthil Murugan',
      role: UserRole.SALON_OWNER,
      gender: Gender.MALE,
      isActive: true,
    },
  });

  console.log('✓ Salon Owners seeded (Chennai, Coimbatore, Madurai)');

  // ==========================================
  // 4. Salons (Tamil Nadu Brands)
  // ==========================================
  const salon1 = await prisma.salon.upsert({
    where: { slug: 'naturals-luxe-chennai' },
    update: { status: SalonStatus.APPROVED },
    create: {
      ownerId: owner1.id,
      brandName: 'Naturals Luxe Salon & Spa',
      slug: 'naturals-luxe-chennai',
      description: 'Tamil Nadu’s premier luxury grooming, South Indian bridal couture, hair styling, and organic Ayurvedic therapies.',
      gstin: '33AAACN1234F1Z8',
      planType: SalonPlanType.PREMIUM_SUBSCRIPTION,
      status: SalonStatus.APPROVED,
    },
  });

  const salon2 = await prisma.salon.upsert({
    where: { slug: 'limelite-studio-chennai' },
    update: { status: SalonStatus.APPROVED },
    create: {
      ownerId: owner2.id,
      brandName: 'Limelite Luxury Studio',
      slug: 'limelite-studio-chennai',
      description: 'Couture hair artistry, tan-removal facials, and destination wedding grooming in Chennai.',
      gstin: '33AABCL5678M1Z2',
      planType: SalonPlanType.PREMIUM_SUBSCRIPTION,
      status: SalonStatus.APPROVED,
    },
  });

  const salon3 = await prisma.salon.upsert({
    where: { slug: 'green-trends-tamilnadu' },
    update: { status: SalonStatus.APPROVED },
    create: {
      ownerId: owner3.id,
      brandName: 'Green Trends Family Salon',
      slug: 'green-trends-tamilnadu',
      description: 'Friendly neighbourhood family salon offering professional haircuts, beard grooming, facials and pedicures.',
      gstin: '33AACGT9012K1Z4',
      planType: SalonPlanType.FREE_COMMISSION,
      status: SalonStatus.APPROVED,
    },
  });

  console.log('✓ Salons seeded: Naturals Luxe, Limelite Studio, Green Trends');

  // ==========================================
  // 5. Branches across Tamil Nadu (Chennai, Coimbatore, Madurai, Trichy, Salem)
  // ==========================================
  const branchesData = [
    // Naturals Luxe Branches
    {
      salonId: salon1.id,
      branchName: 'Naturals Luxe - Anna Nagar West Flagship',
      isPrimary: true,
      addressLine1: 'Plot No. 142, 2nd Avenue, Anna Nagar West',
      addressLine2: 'Near Roundtana',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600040',
      latitude: 13.0850,
      longitude: 80.2101,
      phone: '04426210011',
      genderCategory: BranchGenderCategory.UNISEX,
      status: SalonStatus.APPROVED,
    },
    {
      salonId: salon1.id,
      branchName: 'Naturals Luxe - T. Nagar High Street',
      isPrimary: false,
      addressLine1: 'Shop 45, Usman Road, Panagal Park Vicinity',
      addressLine2: 'T. Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600017',
      latitude: 13.0418,
      longitude: 80.2341,
      phone: '04424340022',
      genderCategory: BranchGenderCategory.UNISEX,
      status: SalonStatus.APPROVED,
    },
    {
      salonId: salon1.id,
      branchName: 'Naturals Luxe - RS Puram Boutique',
      isPrimary: false,
      addressLine1: '88 DB Road, Near Flower Market',
      addressLine2: 'RS Puram',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641002',
      latitude: 11.0117,
      longitude: 76.9472,
      phone: '04222540033',
      genderCategory: BranchGenderCategory.UNISEX,
      status: SalonStatus.APPROVED,
    },
    // Limelite Branches
    {
      salonId: salon2.id,
      branchName: 'Limelite - Nungambakkam Boulevard',
      isPrimary: true,
      addressLine1: '12 Khadar Nawaz Khan Road',
      addressLine2: 'Nungambakkam',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600006',
      latitude: 13.0604,
      longitude: 80.2444,
      phone: '04428330044',
      genderCategory: BranchGenderCategory.UNISEX,
      status: SalonStatus.APPROVED,
    },
    {
      salonId: salon2.id,
      branchName: 'Limelite - Velachery Central',
      isPrimary: false,
      addressLine1: '100 Feet Bypass Road, Near Phoenix Marketcity',
      addressLine2: 'Velachery',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600042',
      latitude: 12.9815,
      longitude: 80.2180,
      phone: '04422440055',
      genderCategory: BranchGenderCategory.UNISEX,
      status: SalonStatus.APPROVED,
    },
    // Green Trends Branches
    {
      salonId: salon3.id,
      branchName: 'Green Trends - KK Nagar Heritage',
      isPrimary: true,
      addressLine1: '24 80 Feet Road, Near Mattuthavani',
      addressLine2: 'KK Nagar',
      city: 'Madurai',
      state: 'Tamil Nadu',
      pincode: '625020',
      latitude: 9.9252,
      longitude: 78.1450,
      phone: '04522580066',
      genderCategory: BranchGenderCategory.UNISEX,
      status: SalonStatus.APPROVED,
    },
    {
      salonId: salon3.id,
      branchName: 'Green Trends - Thillai Nagar Premier',
      isPrimary: false,
      addressLine1: '11th Cross, Salai Road',
      addressLine2: 'Thillai Nagar',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      pincode: '620018',
      latitude: 10.8262,
      longitude: 78.6854,
      phone: '04312760077',
      genderCategory: BranchGenderCategory.UNISEX,
      status: SalonStatus.APPROVED,
    },
  ];

  const createdBranches = [];
  for (const b of branchesData) {
    let branch = await prisma.branch.findFirst({
      where: { salonId: b.salonId, branchName: b.branchName },
    });
    if (!branch) {
      branch = await prisma.branch.create({ data: b });
    }
    createdBranches.push(branch);
  }
  console.log(`✓ ${createdBranches.length} Tamil Nadu branches seeded (Chennai, Coimbatore, Madurai, Trichy)`);

  const primaryBranch = createdBranches[0];

  // ==========================================
  // 6. Service Categories
  // ==========================================
  const categoriesData = [
    { name: 'Hair Styling & Scalp Therapy', displayOrder: 1 },
    { name: 'Traditional & Luxury Skincare', displayOrder: 2 },
    { name: 'South Indian Bridal & Muhurtham', displayOrder: 3 },
    { name: 'Spa, Body & Reflexology', displayOrder: 4 },
    { name: 'Men’s Royal Grooming', displayOrder: 5 },
    { name: 'Nail Art, Pedicure & Mehendi', displayOrder: 6 },
  ];

  const createdCategories = [];
  for (const c of categoriesData) {
    const cat = await prisma.serviceCategory.upsert({
      where: { name: c.name },
      update: { displayOrder: c.displayOrder },
      create: c,
    });
    createdCategories.push(cat);
  }
  console.log(`✓ ${createdCategories.length} Service Categories seeded`);

  // ==========================================
  // 7. Authentic Tamil Nadu Services
  // ==========================================
  const servicesData = [
    // Hair
    {
      categoryId: createdCategories[0].id,
      name: 'Classic Gentlemen Haircut & Head Wash',
      description: 'Precision scissor and clipper cut styled with cooling menthol wash and hair tonic.',
      genderCategory: BranchGenderCategory.MEN,
      price: 350,
      durationMinutes: 30,
    },
    {
      categoryId: createdCategories[0].id,
      name: 'Coconut & Hibiscus Herbal Anti-Dandruff Spa',
      description: 'Traditional South Indian herbal infusion hair spa with warm coconut oil and kesh treatment.',
      genderCategory: BranchGenderCategory.UNISEX,
      price: 950,
      durationMinutes: 45,
    },
    {
      categoryId: createdCategories[0].id,
      name: 'L’Oréal Professional Keratin Hair Smoothing',
      description: 'Intense moisture restoration and frizz control for smooth, glossy hair.',
      genderCategory: BranchGenderCategory.WOMEN,
      price: 3800,
      durationMinutes: 120,
    },
    // Skincare
    {
      categoryId: createdCategories[1].id,
      name: 'Kasturi Turmeric & Sandalwood Radiant Glow Facial',
      description: 'Authentic pure Mysore sandalwood paste and Kasturi Manjal herbal blend for luminous skin.',
      genderCategory: BranchGenderCategory.UNISEX,
      price: 1850,
      durationMinutes: 60,
    },
    {
      categoryId: createdCategories[1].id,
      name: 'Kumkumadi Ayurvedic Saffron Gold Rejuvenation',
      description: 'Enriched with pure Kashmiri saffron and Kumkumadi Tailam to detoxify and revive youthful texture.',
      genderCategory: BranchGenderCategory.UNISEX,
      price: 2400,
      durationMinutes: 75,
    },
    {
      categoryId: createdCategories[1].id,
      name: 'O3+ Seaweed Tan Removal & Skin Brightening',
      description: 'Instant de-tan formulation specially designed for tropical South Indian sun exposure.',
      genderCategory: BranchGenderCategory.UNISEX,
      price: 1600,
      durationMinutes: 50,
    },
    // Bridal
    {
      categoryId: createdCategories[2].id,
      name: 'Traditional South Indian Muhurtham HD Bridal Makeup',
      description: 'Complete water-resistant HD bridal makeup, Kanchipuram silk saree draping, and traditional floral hair adornment (Jadai & Mallipoo).',
      genderCategory: BranchGenderCategory.WOMEN,
      price: 12500,
      durationMinutes: 180,
    },
    {
      categoryId: createdCategories[2].id,
      name: 'Tanjore Temple Gold Royal Bridal Package',
      description: 'Airbrush bridal makeup, temple jewelry setting assistance, pre-bridal glow facial, and full mehendi application.',
      genderCategory: BranchGenderCategory.WOMEN,
      price: 18000,
      durationMinutes: 240,
    },
    // Spa & Reflexology
    {
      categoryId: createdCategories[3].id,
      name: 'Ayurvedic Herbal Foot Reflexology & Pedicure',
      description: 'Warm herbal salt soak with neem and eucalyptus oils followed by deep pressure point reflexology.',
      genderCategory: BranchGenderCategory.UNISEX,
      price: 850,
      durationMinutes: 45,
    },
    {
      categoryId: createdCategories[3].id,
      name: 'Warm Sesame Oil Deep Tissue Stress Relief Therapy',
      description: 'Full body Abhyanga style massage using medicated warm oils to relieve muscle stiffness.',
      genderCategory: BranchGenderCategory.UNISEX,
      price: 2800,
      durationMinutes: 90,
    },
    // Men's Grooming
    {
      categoryId: createdCategories[4].id,
      name: 'Royal Beard Sculpting, Hot Towel & Steam',
      description: 'Razor edge contouring, organic beard oil massage, and soothing eucalyptus steam therapy.',
      genderCategory: BranchGenderCategory.MEN,
      price: 450,
      durationMinutes: 30,
    },
    {
      categoryId: createdCategories[4].id,
      name: 'Groom Royal Pre-Wedding Reception Grooming',
      description: 'Haircut, charcoal de-tan facial, beard shaping, and manicure package for South Indian grooms.',
      genderCategory: BranchGenderCategory.MEN,
      price: 3200,
      durationMinutes: 90,
    },
  ];

  for (const s of servicesData) {
    let service = await prisma.service.findFirst({
      where: { categoryId: s.categoryId, name: s.name },
    });
    if (!service) {
      service = await prisma.service.create({
        data: {
          categoryId: s.categoryId,
          name: s.name,
          description: s.description,
          genderCategory: s.genderCategory,
        },
      });
    }

    // Attach to all branches
    for (const branch of createdBranches) {
      let branchService = await prisma.branchService.findFirst({
        where: { branchId: branch.id, serviceId: service.id },
      });
      if (!branchService) {
        await prisma.branchService.create({
          data: {
            branchId: branch.id,
            serviceId: service.id,
            price: s.price,
            durationMinutes: s.durationMinutes,
            status: ServiceStatus.ACTIVE,
            isActive: true,
          },
        });
      }
    }
  }
  console.log(`✓ ${servicesData.length} authentic services seeded and linked across all branches`);

  // ==========================================
  // 8. Staff / Stylists (Tamil Nadu Professionals)
  // ==========================================
  const staffMembers = [
    {
      email: 'anitha.b@naturalsluxe.in',
      phone: '9840111222',
      firstName: 'Anitha',
      lastName: 'Balasubramanian',
      displayName: 'Anitha Balasubramanian',
      role: StaffRole.STYLIST,
      bio: 'Master Bridal Makeup Artist & Kanchipuram Saree Draping specialist with 9+ years experience.',
      employeeCode: 'NL-CHE-001',
      salonId: salon1.id,
      branchId: primaryBranch.id,
    },
    {
      email: 'murugan.p@naturalsluxe.in',
      phone: '9840222333',
      firstName: 'Murugan',
      lastName: 'Pandian',
      displayName: 'Murugan Pandian',
      role: StaffRole.STYLIST,
      bio: 'Senior Creative Hair Stylist & Keratin Smoothing Specialist.',
      employeeCode: 'NL-CHE-002',
      salonId: salon1.id,
      branchId: primaryBranch.id,
    },
    {
      email: 'divya.m@naturalsluxe.in',
      phone: '9840333444',
      firstName: 'Divya',
      lastName: 'Meenakshi',
      displayName: 'Divya Meenakshi',
      role: StaffRole.THERAPIST,
      bio: 'Senior Ayurvedic Skin & Spa Therapist trained in holistic wellness rituals.',
      employeeCode: 'NL-CHE-003',
      salonId: salon1.id,
      branchId: primaryBranch.id,
    },
    {
      email: 'ramesh.k@naturalsluxe.in',
      phone: '9840444555',
      firstName: 'Ramesh',
      lastName: 'Krishnan',
      displayName: 'Ramesh Krishnan',
      role: StaffRole.STYLIST,
      bio: 'Master Barber & Beard Stylist specializing in contemporary fades.',
      employeeCode: 'NL-CHE-004',
      salonId: salon1.id,
      branchId: primaryBranch.id,
    },
  ];

  for (const st of staffMembers) {
    const user = await prisma.user.upsert({
      where: { email: st.email },
      update: { passwordHash: DEFAULT_PASSWORD_HASH, role: UserRole.SALON_STAFF, isActive: true },
      create: {
        phone: st.phone,
        phoneVerified: true,
        email: st.email,
        emailVerified: true,
        passwordHash: DEFAULT_PASSWORD_HASH,
        firstName: st.firstName,
        lastName: st.lastName,
        displayName: st.displayName,
        role: UserRole.SALON_STAFF,
        isActive: true,
      },
    });

    let staff = await prisma.staff.findFirst({
      where: { salonId: st.salonId, employeeCode: st.employeeCode },
    });
    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          userId: user.id,
          salonId: st.salonId,
          employeeCode: st.employeeCode,
          displayName: st.displayName,
          role: st.role,
          bio: st.bio,
          employmentStatus: EmploymentStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });
    }

    // Branch assignment
    const assignment = await prisma.staffBranchAssignment.findFirst({
      where: { staffId: staff.id, branchId: st.branchId },
    });
    if (!assignment) {
      await prisma.staffBranchAssignment.create({
        data: {
          staffId: staff.id,
          branchId: st.branchId,
          isPrimary: true,
          isActive: true,
          startDate: new Date(),
        },
      });
    }
  }
  console.log(`✓ ${staffMembers.length} Staff members seeded (Anitha, Murugan, Divya, Ramesh)`);

  // ==========================================
  // 9. Customers (Tamil Nadu Residents)
  // ==========================================
  const customersData = [
    {
      phone: '9840555666',
      email: 'kavitha.ranganathan@gmail.com',
      firstName: 'Kavitha',
      lastName: 'Ranganathan',
      displayName: 'Kavitha Ranganathan',
      gender: Gender.FEMALE,
      walletBalance: 2500,
      lifetimeSpend: 18500,
      totalVisits: 6,
    },
    {
      phone: '9840666777',
      email: 'suresh.kumar.cbe@gmail.com',
      firstName: 'Suresh',
      lastName: 'Kumar',
      displayName: 'Suresh Kumar',
      gender: Gender.MALE,
      walletBalance: 1200,
      lifetimeSpend: 8400,
      totalVisits: 8,
    },
    {
      phone: '9840777888',
      email: 'deepa.sundaram@gmail.com',
      firstName: 'Deepa',
      lastName: 'Sundaram',
      displayName: 'Deepa Sundaram',
      gender: Gender.FEMALE,
      walletBalance: 5000,
      lifetimeSpend: 34000,
      totalVisits: 12,
    },
    {
      phone: '9840888999',
      email: 'saravanan.m@yahoo.com',
      firstName: 'Saravanan',
      lastName: 'Manikandan',
      displayName: 'Saravanan Manikandan',
      gender: Gender.MALE,
      walletBalance: 800,
      lifetimeSpend: 4200,
      totalVisits: 4,
    },
  ];

  for (let i = 0; i < customersData.length; i++) {
    const c = customersData[i];
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: { passwordHash: DEFAULT_PASSWORD_HASH, role: UserRole.CUSTOMER, isActive: true },
      create: {
        phone: c.phone,
        phoneVerified: true,
        email: c.email,
        emailVerified: true,
        passwordHash: DEFAULT_PASSWORD_HASH,
        firstName: c.firstName,
        lastName: c.lastName,
        displayName: c.displayName,
        role: UserRole.CUSTOMER,
        gender: c.gender,
        isActive: true,
      },
    });

    const custProfile = await prisma.customerProfile.findFirst({
      where: { salonId: salon1.id, phone: c.phone },
    });
    if (!custProfile) {
      await prisma.customerProfile.create({
        data: {
          customerCode: `CUST-TN-00${i + 1}`,
          userId: user.id,
          salonId: salon1.id,
          primaryBranchId: primaryBranch.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          gender: c.gender,
          status: CustomerStatus.ACTIVE,
          walletBalance: c.walletBalance,
          lifetimeSpend: c.lifetimeSpend,
          totalVisits: c.totalVisits,
          createdByUserId: superAdmin.id,
        },
      });
    }
  }
  console.log(`✓ ${customersData.length} Customers and CRM profiles seeded (Kavitha, Suresh, Deepa, Saravanan)`);

  // ==========================================
  // 10. Inventory Brands & Products
  // ==========================================
  const brandsData = ['Parachute Professional', 'Matrix Biolage', 'L’Oréal Professionnel', 'Forest Essentials', 'O3+ Professional'];
  const createdBrands = [];
  for (const bName of brandsData) {
    let brand = await prisma.brand.findFirst({
      where: { salonId: salon1.id, name: bName },
    });
    if (!brand) {
      brand = await prisma.brand.create({
        data: { salonId: salon1.id, name: bName, isActive: true },
      });
    }
    createdBrands.push(brand);
  }

  let prodCat = await prisma.productCategory.findFirst({
    where: { salonId: salon1.id, slug: 'hair-care-essentials' },
  });
  if (!prodCat) {
    prodCat = await prisma.productCategory.create({
      data: {
        salonId: salon1.id,
        name: 'Hair Care Essentials',
        slug: 'hair-care-essentials',
        isActive: true,
      },
    });
  }

  let uom = await prisma.unitOfMeasure.findFirst({
    where: { salonId: salon1.id, code: 'BOTTLE' },
  });
  if (!uom) {
    uom = await prisma.unitOfMeasure.create({
      data: {
        salonId: salon1.id,
        name: 'Bottle',
        code: 'BOTTLE',
        unitType: UnitType.VOLUME,
        conversionFactor: 1.0,
      },
    });
  }

  const productsData = [
    {
      name: 'Parachute Advansed Deep Nourish Coconut Oil (500ml)',
      slug: 'parachute-advansed-500ml',
      retailPrice: 420,
      sku: 'PAR-COCO-500',
    },
    {
      name: 'Matrix Opti.Care Smooth Straight Shampoo (1000ml)',
      slug: 'matrix-opti-care-shampoo-1l',
      retailPrice: 1150,
      sku: 'MAT-SHAMP-1000',
    },
    {
      name: 'Forest Essentials Ayurvedic Kumkumadi Night Serum (30ml)',
      slug: 'forest-essentials-kumkumadi-30ml',
      retailPrice: 2750,
      sku: 'FE-KUMK-30',
    },
  ];

  for (const p of productsData) {
    let product = await prisma.product.findFirst({
      where: { salonId: salon1.id, slug: p.slug },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          salonId: salon1.id,
          brandId: createdBrands[0].id,
          categoryId: prodCat.id,
          uomId: uom.id,
          name: p.name,
          slug: p.slug,
          productType: ProductType.RETAIL,
          isActive: true,
        },
      });

      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: p.sku,
          variantName: 'Standard Pack',
          costPrice: Math.round(p.retailPrice * 0.6),
          retailPrice: p.retailPrice,
          minStockLevel: 5,
          reorderPoint: 10,
          reorderQuantity: 25,
        },
      });
    }
  }
  console.log('✓ Inventory Brands & Retail Products seeded (Parachute, Matrix, Forest Essentials)');

  // ==========================================
  // 11. Promotions & Coupons
  // ==========================================
  const couponsData = [
    {
      code: 'CHENNAI100',
      name: 'Namma Chennai Special Discount',
      description: 'Flat ₹100 off on any booking above ₹500 across all Chennai branches.',
      discountType: CouponDiscountType.FIXED_AMOUNT,
      discountValue: 100,
      minBookingAmount: 500,
    },
    {
      code: 'BRIDAL20',
      name: 'Muhurtham Season Celebration',
      description: '20% off on South Indian Bridal & Wedding Packages.',
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 20,
      maxDiscountAmount: 3000,
      minBookingAmount: 5000,
    },
    {
      code: 'PONGALGLOW',
      name: 'Festive Pongal Glow Offer',
      description: '15% instant discount on all Ayurvedic & Traditional Facials.',
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 15,
      maxDiscountAmount: 500,
      minBookingAmount: 1000,
    },
  ];

  for (const cp of couponsData) {
    let coupon = await prisma.coupon.findFirst({
      where: { salonId: salon1.id, code: cp.code },
    });
    if (!coupon) {
      await prisma.coupon.create({
        data: {
          salonId: salon1.id,
          code: cp.code,
          name: cp.name,
          description: cp.description,
          discountType: cp.discountType,
          discountValue: cp.discountValue,
          maxDiscountAmount: cp.maxDiscountAmount,
          minBookingAmount: cp.minBookingAmount,
          applicabilityType: CouponApplicabilityType.ALL_SERVICES,
          customerEligibility: CouponCustomerEligibilityType.ALL_CUSTOMERS,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          status: CouponStatus.ACTIVE,
        },
      });
    }
  }
  console.log('✓ Regional Coupons seeded: CHENNAI100, BRIDAL20, PONGALGLOW');

  // ==========================================
  // 12. Reviews & Customer Testimonials
  // ==========================================
  const firstCustomer = await prisma.user.findFirst({ where: { email: 'kavitha.ranganathan@gmail.com' } });
  if (firstCustomer) {
    const existingReview = await prisma.review.findFirst({
      where: { salonId: salon1.id, customerId: firstCustomer.id },
    });
    if (!existingReview) {
      await prisma.review.create({
        data: {
          salonId: salon1.id,
          branchId: primaryBranch.id,
          customerId: firstCustomer.id,
          overallRating: 5,
          reviewTitle: 'Exceptional Muhurtham Bridal Makeup by Anitha!',
          reviewComment: 'Booked Naturals Luxe Anna Nagar for my cousin’s wedding. Anitha did a fabulous job with the Kanchipuram silk saree draping and traditional Jadai mallipoo styling. Highly recommend to everyone in Chennai!',
          cleanlinessRating: 5,
          hospitalityRating: 5,
          valueRating: 5,
          ambienceRating: 5,
          status: ReviewStatus.PUBLISHED,
          isVerifiedPurchase: true,
          publishedAt: new Date(),
        },
      });
    }
  }
  console.log('✓ Authentic Customer Reviews & Ratings seeded');

  console.log('\n===============================================================');
  console.log('✨ NEON DATABASE READY WITH RICH TAMIL NADU DATA');
  console.log('===============================================================');
  console.log('1. SuperAdmin Portal (http://localhost:3002)');
  console.log('   Email:    superadmin@saloon.com');
  console.log('   Password: Password@123');
  console.log('---------------------------------------------------------------');
  console.log('2. Salon Owner Portals (http://localhost:3001)');
  console.log('   Naturals Luxe (Chennai):      karthik@naturalsluxe.in / Password@123');
  console.log('   Limelite Studio (Chennai):    priya@limelitestudio.in / Password@123');
  console.log('   Green Trends (Madurai/TN):    senthil@greentrends-tn.in / Password@123');
  console.log('===============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
